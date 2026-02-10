// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./AgentRegistry.sol";

/**
 * @title JobEscrow
 * @dev Core escrow contract for trustless agent-to-agent job execution
 */
contract JobEscrow {
    enum JobStatus {
        Pending,
        Accepted,
        Submitted,
        Completed,
        Failed,
        Cancelled
    }
    
    struct Job {
        uint256 jobId;
        address poster;
        address executor;
        bytes32 expectedHash;
        bytes32 submittedHash;
        uint256 payment;
        uint256 collateral;
        uint256 deadline;
        JobStatus status;
        string capability;
        uint256 createdAt;
        uint256 completedAt;
    }
    
    // AUSD token contract
    IERC20 public ausdToken;
    
    // Agent registry contract
    AgentRegistry public agentRegistry;
    
    // Job counter
    uint256 public jobCounter;
    
    // Mapping from job ID to Job
    mapping(uint256 => Job) public jobs;
    
    // Reentrancy guard
    bool private locked;
    
    // Reputation deltas
    int256 public constant REPUTATION_SUCCESS = 5;
    int256 public constant REPUTATION_FAILURE = -10;
    
    // Events
    event JobPosted(
        uint256 indexed jobId,
        address indexed poster,
        uint256 payment,
        uint256 collateral,
        string capability,
        uint256 deadline
    );
    
    event JobAccepted(
        uint256 indexed jobId,
        address indexed executor,
        uint256 collateral
    );
    
    event JobSubmitted(
        uint256 indexed jobId,
        address indexed executor,
        bytes32 submittedHash
    );
    
    event JobCompleted(
        uint256 indexed jobId,
        bool verified,
        uint256 payment,
        address indexed executor
    );
    
    event JobFailed(
        uint256 indexed jobId,
        string reason,
        uint256 slashedAmount
    );
    
    event JobCancelled(
        uint256 indexed jobId,
        address indexed poster,
        uint256 refundedAmount
    );
    
    modifier noReentrant() {
        require(!locked, "No reentrancy");
        locked = true;
        _;
        locked = false;
    }
    
    modifier onlyPoster(uint256 _jobId) {
        require(jobs[_jobId].poster == msg.sender, "Only poster");
        _;
    }
    
    modifier onlyExecutor(uint256 _jobId) {
        require(jobs[_jobId].executor == msg.sender, "Only executor");
        _;
    }
    
    constructor(address _ausdToken, address _agentRegistry) {
        require(_ausdToken != address(0), "Invalid AUSD address");
        require(_agentRegistry != address(0), "Invalid registry address");
        
        ausdToken = IERC20(_ausdToken);
        agentRegistry = AgentRegistry(_agentRegistry);
    }
    
    /**
     * @dev Post a new job
     * @param _expectedHash Expected result hash
     * @param _payment Payment amount in AUSD
     * @param _collateral Required collateral from executor
     * @param _capability Required capability
     * @param _deadlineMinutes Deadline in minutes from now
     */
    function postJob(
        bytes32 _expectedHash,
        uint256 _payment,
        uint256 _collateral,
        string memory _capability,
        uint256 _deadlineMinutes
    ) external noReentrant returns (uint256) {
        require(_expectedHash != bytes32(0), "Invalid hash");
        require(_payment > 0, "Payment must be > 0");
        require(_collateral > 0, "Collateral must be > 0");
        require(_deadlineMinutes > 0, "Deadline must be > 0");
        require(agentRegistry.isAgentActive(msg.sender), "Poster not active");
        
        // Transfer payment to escrow
        require(
            ausdToken.transferFrom(msg.sender, address(this), _payment),
            "Payment transfer failed"
        );
        
        jobCounter++;
        uint256 jobId = jobCounter;
        
        Job storage job = jobs[jobId];
        job.jobId = jobId;
        job.poster = msg.sender;
        job.expectedHash = _expectedHash;
        job.payment = _payment;
        job.collateral = _collateral;
        job.deadline = block.timestamp + (_deadlineMinutes * 1 minutes);
        job.status = JobStatus.Pending;
        job.capability = _capability;
        job.createdAt = block.timestamp;
        
        emit JobPosted(
            jobId,
            msg.sender,
            _payment,
            _collateral,
            _capability,
            job.deadline
        );
        
        return jobId;
    }
    
    /**
     * @dev Accept a job
     * @param _jobId Job ID to accept
     */
    function acceptJob(uint256 _jobId) external noReentrant {
        Job storage job = jobs[_jobId];
        
        require(job.status == JobStatus.Pending, "Job not available");
        require(job.poster != msg.sender, "Cannot accept own job");
        require(block.timestamp < job.deadline, "Job expired");
        require(agentRegistry.isAgentActive(msg.sender), "Executor not active");
        
        // Transfer collateral to escrow
        require(
            ausdToken.transferFrom(msg.sender, address(this), job.collateral),
            "Collateral transfer failed"
        );
        
        job.executor = msg.sender;
        job.status = JobStatus.Accepted;
        
        emit JobAccepted(_jobId, msg.sender, job.collateral);
    }
    
    /**
     * @dev Submit job result
     * @param _jobId Job ID
     * @param _resultHash Hash of the result
     */
    function submitResult(uint256 _jobId, bytes32 _resultHash) 
        external 
        noReentrant 
        onlyExecutor(_jobId) 
    {
        Job storage job = jobs[_jobId];
        
        require(job.status == JobStatus.Accepted, "Job not accepted");
        require(block.timestamp < job.deadline, "Deadline passed");
        require(_resultHash != bytes32(0), "Invalid hash");
        
        job.submittedHash = _resultHash;
        job.status = JobStatus.Submitted;
        
        emit JobSubmitted(_jobId, msg.sender, _resultHash);
        
        // Automatically verify and settle
        _verifyAndSettle(_jobId);
    }
    
    /**
     * @dev Internal function to verify hash and settle payment
     * @param _jobId Job ID
     */
    function _verifyAndSettle(uint256 _jobId) internal {
        Job storage job = jobs[_jobId];
        
        bool hashMatch = (job.expectedHash == job.submittedHash);
        
        if (hashMatch) {
            // Success: Pay executor and return collateral
            job.status = JobStatus.Completed;
            job.completedAt = block.timestamp;
            
            uint256 totalPayout = job.payment + job.collateral;
            
            require(
                ausdToken.transfer(job.executor, totalPayout),
                "Payment transfer failed"
            );
            
            // Update reputation and stats
            agentRegistry.updateReputation(job.executor, REPUTATION_SUCCESS);
            agentRegistry.updateJobStats(job.poster, job.executor, job.payment, true);
            
            emit JobCompleted(_jobId, true, job.payment, job.executor);
        } else {
            // Failure: Slash collateral, refund poster
            job.status = JobStatus.Failed;
            job.completedAt = block.timestamp;
            
            uint256 totalRefund = job.payment + job.collateral;
            
            require(
                ausdToken.transfer(job.poster, totalRefund),
                "Refund transfer failed"
            );
            
            // Update reputation (negative for executor)
            agentRegistry.updateReputation(job.executor, REPUTATION_FAILURE);
            agentRegistry.updateJobStats(job.poster, job.executor, job.payment, false);
            
            emit JobFailed(_jobId, "Hash mismatch", job.collateral);
        }
    }
    
    /**
     * @dev Cancel job before acceptance
     * @param _jobId Job ID to cancel
     */
    function cancelJob(uint256 _jobId) external noReentrant onlyPoster(_jobId) {
        Job storage job = jobs[_jobId];
        
        require(job.status == JobStatus.Pending, "Can only cancel pending jobs");
        
        job.status = JobStatus.Cancelled;
        
        // Refund payment to poster
        require(
            ausdToken.transfer(job.poster, job.payment),
            "Refund transfer failed"
        );
        
        emit JobCancelled(_jobId, msg.sender, job.payment);
    }
    
    /**
     * @dev Claim refund if executor missed deadline
     * @param _jobId Job ID
     */
    function claimTimeout(uint256 _jobId) external noReentrant onlyPoster(_jobId) {
        Job storage job = jobs[_jobId];
        
        require(job.status == JobStatus.Accepted, "Job not in accepted state");
        require(block.timestamp >= job.deadline, "Deadline not passed");
        
        job.status = JobStatus.Failed;
        job.completedAt = block.timestamp;
        
        // Refund payment + slashed collateral to poster
        uint256 totalRefund = job.payment + job.collateral;
        
        require(
            ausdToken.transfer(job.poster, totalRefund),
            "Refund transfer failed"
        );
        
        // Negative reputation for executor
        agentRegistry.updateReputation(job.executor, REPUTATION_FAILURE);
        agentRegistry.updateJobStats(job.poster, job.executor, job.payment, false);
        
        emit JobFailed(_jobId, "Deadline exceeded", job.collateral);
    }
    
    /**
     * @dev Get job details
     * @param _jobId Job ID
     */
    function getJob(uint256 _jobId) external view returns (
        uint256 jobId,
        address poster,
        address executor,
        bytes32 expectedHash,
        bytes32 submittedHash,
        uint256 payment,
        uint256 collateral,
        uint256 deadline,
        JobStatus status,
        string memory capability,
        uint256 createdAt,
        uint256 completedAt
    ) {
        Job memory job = jobs[_jobId];
        return (
            job.jobId,
            job.poster,
            job.executor,
            job.expectedHash,
            job.submittedHash,
            job.payment,
            job.collateral,
            job.deadline,
            job.status,
            job.capability,
            job.createdAt,
            job.completedAt
        );
    }
    
    /**
     * @dev Get total jobs count
     */
    function getTotalJobs() external view returns (uint256) {
        return jobCounter;
    }
}
