// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentRegistry
 * @dev Manages agent identities and reputation on-chain
 */
contract AgentRegistry {
    struct Agent {
        address wallet;
        string[] capabilities;
        int256 reputationScore;
        uint256 totalJobsCompleted;
        uint256 totalJobsPosted;
        uint256 totalEarned;
        uint256 totalSpent;
        bool isActive;
        uint256 registeredAt;
    }
    
    // Mapping from wallet address to Agent
    mapping(address => Agent) public agents;
    
    // Mapping to check if agent is registered
    mapping(address => bool) public isRegistered;
    
    // Authorized contracts that can update reputation (JobEscrow)
    mapping(address => bool) public authorizedContracts;
    
    // Contract owner
    address public owner;
    
    // Events
    event AgentRegistered(
        address indexed wallet,
        string[] capabilities,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        address indexed wallet,
        int256 newScore,
        int256 delta,
        uint256 timestamp
    );
    
    event CapabilitiesUpdated(
        address indexed wallet,
        string[] capabilities,
        uint256 timestamp
    );
    
    event JobStatsUpdated(
        address indexed wallet,
        uint256 totalJobsCompleted,
        uint256 totalJobsPosted,
        uint256 totalEarned,
        uint256 totalSpent
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }
    
    modifier onlyRegistered() {
        require(isRegistered[msg.sender], "Agent not registered");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a new agent
     * @param _capabilities Array of capability strings
     */
    function registerAgent(string[] memory _capabilities) external {
        require(!isRegistered[msg.sender], "Already registered");
        require(_capabilities.length > 0, "Must have at least one capability");
        
        Agent storage agent = agents[msg.sender];
        agent.wallet = msg.sender;
        agent.capabilities = _capabilities;
        agent.reputationScore = 0;
        agent.totalJobsCompleted = 0;
        agent.totalJobsPosted = 0;
        agent.totalEarned = 0;
        agent.totalSpent = 0;
        agent.isActive = true;
        agent.registeredAt = block.timestamp;
        
        isRegistered[msg.sender] = true;
        
        emit AgentRegistered(msg.sender, _capabilities, block.timestamp);
    }
    
    /**
     * @dev Update agent capabilities
     * @param _capabilities New array of capabilities
     */
    function updateCapabilities(string[] memory _capabilities) external onlyRegistered {
        require(_capabilities.length > 0, "Must have at least one capability");
        
        agents[msg.sender].capabilities = _capabilities;
        
        emit CapabilitiesUpdated(msg.sender, _capabilities, block.timestamp);
    }
    
    /**
     * @dev Update agent reputation (only callable by authorized contracts)
     * @param _agent Agent address
     * @param _delta Reputation change (positive or negative)
     */
    function updateReputation(address _agent, int256 _delta) external onlyAuthorized {
        require(isRegistered[_agent], "Agent not registered");
        
        agents[_agent].reputationScore += _delta;
        
        emit ReputationUpdated(
            _agent,
            agents[_agent].reputationScore,
            _delta,
            block.timestamp
        );
    }
    
    /**
     * @dev Update job statistics (only callable by authorized contracts)
     * @param _poster Job poster address
     * @param _executor Job executor address
     * @param _payment Payment amount
     * @param _success Whether job was successful
     */
    function updateJobStats(
        address _poster,
        address _executor,
        uint256 _payment,
        bool _success
    ) external onlyAuthorized {
        require(isRegistered[_poster], "Poster not registered");
        require(isRegistered[_executor], "Executor not registered");
        
        // Update poster stats
        agents[_poster].totalJobsPosted += 1;
        agents[_poster].totalSpent += _payment;
        
        // Update executor stats only if successful
        if (_success) {
            agents[_executor].totalJobsCompleted += 1;
            agents[_executor].totalEarned += _payment;
        }
        
        emit JobStatsUpdated(
            _poster,
            agents[_poster].totalJobsCompleted,
            agents[_poster].totalJobsPosted,
            agents[_poster].totalEarned,
            agents[_poster].totalSpent
        );
        
        emit JobStatsUpdated(
            _executor,
            agents[_executor].totalJobsCompleted,
            agents[_executor].totalJobsPosted,
            agents[_executor].totalEarned,
            agents[_executor].totalSpent
        );
    }
    
    /**
     * @dev Get agent information
     * @param _agent Agent address
     */
    function getAgentInfo(address _agent) external view returns (
        address wallet,
        string[] memory capabilities,
        int256 reputationScore,
        uint256 totalJobsCompleted,
        uint256 totalJobsPosted,
        uint256 totalEarned,
        uint256 totalSpent,
        bool isActive,
        uint256 registeredAt
    ) {
        require(isRegistered[_agent], "Agent not registered");
        
        Agent memory agent = agents[_agent];
        return (
            agent.wallet,
            agent.capabilities,
            agent.reputationScore,
            agent.totalJobsCompleted,
            agent.totalJobsPosted,
            agent.totalEarned,
            agent.totalSpent,
            agent.isActive,
            agent.registeredAt
        );
    }
    
    /**
     * @dev Check if agent is active
     * @param _agent Agent address
     */
    function isAgentActive(address _agent) external view returns (bool) {
        return isRegistered[_agent] && agents[_agent].isActive;
    }
    
    /**
     * @dev Authorize a contract to update reputation (only owner)
     * @param _contract Contract address
     */
    function authorizeContract(address _contract) external onlyOwner {
        authorizedContracts[_contract] = true;
    }
    
    /**
     * @dev Revoke contract authorization (only owner)
     * @param _contract Contract address
     */
    function revokeContractAuthorization(address _contract) external onlyOwner {
        authorizedContracts[_contract] = false;
    }
    
    /**
     * @dev Deactivate agent account
     */
    function deactivateAgent() external onlyRegistered {
        agents[msg.sender].isActive = false;
    }
    
    /**
     * @dev Reactivate agent account
     */
    function reactivateAgent() external onlyRegistered {
        agents[msg.sender].isActive = true;
    }
}
