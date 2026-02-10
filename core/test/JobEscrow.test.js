const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("JobEscrow", function () {
    let jobEscrow;
    let agentRegistry;
    let ausdToken;
    let owner;
    let poster;
    let executor;
    let other;

    const PAYMENT_AMOUNT = ethers.parseEther("10");
    const COLLATERAL_AMOUNT = ethers.parseEther("5");
    const DEADLINE_MINUTES = 30;
    const CAPABILITY = "scraping";
    const EXPECTED_HASH = ethers.keccak256(ethers.toUtf8Bytes("expected result"));

    beforeEach(async function () {
        [owner, poster, executor, other] = await ethers.getSigners();

        // Deploy MockERC20 (AUSD)
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        ausdToken = await MockERC20.deploy();
        await ausdToken.waitForDeployment();

        // Deploy AgentRegistry
        const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy();
        await agentRegistry.waitForDeployment();

        // Deploy JobEscrow
        const JobEscrow = await ethers.getContractFactory("JobEscrow");
        jobEscrow = await JobEscrow.deploy(
            await ausdToken.getAddress(),
            await agentRegistry.getAddress()
        );
        await jobEscrow.waitForDeployment();

        // Authorize JobEscrow in AgentRegistry
        await agentRegistry.authorizeContract(await jobEscrow.getAddress());

        // Register agents
        await agentRegistry.connect(poster).registerAgent(["research"]);
        await agentRegistry.connect(executor).registerAgent([CAPABILITY]);

        // Mint AUSD to poster and executor
        await ausdToken.mint(poster.address, ethers.parseEther("1000"));
        await ausdToken.mint(executor.address, ethers.parseEther("1000"));

        // Approve JobEscrow to spend AUSD
        await ausdToken
            .connect(poster)
            .approve(await jobEscrow.getAddress(), ethers.parseEther("1000"));
        await ausdToken
            .connect(executor)
            .approve(await jobEscrow.getAddress(), ethers.parseEther("1000"));
    });

    describe("Job Posting", function () {
        it("Should post a job successfully", async function () {
            await expect(
                jobEscrow
                    .connect(poster)
                    .postJob(
                        EXPECTED_HASH,
                        PAYMENT_AMOUNT,
                        COLLATERAL_AMOUNT,
                        CAPABILITY,
                        DEADLINE_MINUTES
                    )
            ).to.emit(jobEscrow, "JobPosted");

            const job = await jobEscrow.getJob(1);
            expect(job.poster).to.equal(poster.address);
            expect(job.payment).to.equal(PAYMENT_AMOUNT);
            expect(job.collateral).to.equal(COLLATERAL_AMOUNT);
            expect(job.expectedHash).to.equal(EXPECTED_HASH);
            expect(job.status).to.equal(0); // Pending
        });

        it("Should transfer payment to escrow", async function () {
            const initialBalance = await ausdToken.balanceOf(poster.address);

            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );

            const finalBalance = await ausdToken.balanceOf(poster.address);
            expect(initialBalance - finalBalance).to.equal(PAYMENT_AMOUNT);
        });

        it("Should fail with invalid hash", async function () {
            await expect(
                jobEscrow
                    .connect(poster)
                    .postJob(
                        ethers.ZeroHash,
                        PAYMENT_AMOUNT,
                        COLLATERAL_AMOUNT,
                        CAPABILITY,
                        DEADLINE_MINUTES
                    )
            ).to.be.revertedWith("Invalid hash");
        });

        it("Should fail with zero payment", async function () {
            await expect(
                jobEscrow
                    .connect(poster)
                    .postJob(EXPECTED_HASH, 0, COLLATERAL_AMOUNT, CAPABILITY, DEADLINE_MINUTES)
            ).to.be.revertedWith("Payment must be > 0");
        });

        it("Should fail if poster not active", async function () {
            await agentRegistry.connect(poster).deactivateAgent();

            await expect(
                jobEscrow
                    .connect(poster)
                    .postJob(
                        EXPECTED_HASH,
                        PAYMENT_AMOUNT,
                        COLLATERAL_AMOUNT,
                        CAPABILITY,
                        DEADLINE_MINUTES
                    )
            ).to.be.revertedWith("Poster not active");
        });
    });

    describe("Job Acceptance", function () {
        let jobId;

        beforeEach(async function () {
            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );
            jobId = 1;
        });

        it("Should accept a job successfully", async function () {
            await expect(jobEscrow.connect(executor).acceptJob(jobId))
                .to.emit(jobEscrow, "JobAccepted")
                .withArgs(jobId, executor.address, COLLATERAL_AMOUNT);

            const job = await jobEscrow.getJob(jobId);
            expect(job.executor).to.equal(executor.address);
            expect(job.status).to.equal(1); // Accepted
        });

        it("Should transfer collateral to escrow", async function () {
            const initialBalance = await ausdToken.balanceOf(executor.address);

            await jobEscrow.connect(executor).acceptJob(jobId);

            const finalBalance = await ausdToken.balanceOf(executor.address);
            expect(initialBalance - finalBalance).to.equal(COLLATERAL_AMOUNT);
        });

        it("Should fail if job not pending", async function () {
            await jobEscrow.connect(executor).acceptJob(jobId);

            await expect(
                jobEscrow.connect(other).acceptJob(jobId)
            ).to.be.revertedWith("Job not available");
        });

        it("Should fail if accepting own job", async function () {
            await expect(
                jobEscrow.connect(poster).acceptJob(jobId)
            ).to.be.revertedWith("Cannot accept own job");
        });

        it("Should fail if executor not active", async function () {
            await agentRegistry.connect(executor).deactivateAgent();

            await expect(
                jobEscrow.connect(executor).acceptJob(jobId)
            ).to.be.revertedWith("Executor not active");
        });

        it("Should fail if deadline passed", async function () {
            await time.increase(DEADLINE_MINUTES * 60 + 1);

            await expect(
                jobEscrow.connect(executor).acceptJob(jobId)
            ).to.be.revertedWith("Job expired");
        });
    });

    describe("Job Submission and Verification", function () {
        let jobId;

        beforeEach(async function () {
            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );
            jobId = 1;
            await jobEscrow.connect(executor).acceptJob(jobId);
        });

        it("Should complete job with matching hash", async function () {
            const initialExecutorBalance = await ausdToken.balanceOf(executor.address);

            await expect(
                jobEscrow.connect(executor).submitResult(jobId, EXPECTED_HASH)
            )
                .to.emit(jobEscrow, "JobSubmitted")
                .withArgs(jobId, executor.address, EXPECTED_HASH)
                .and.to.emit(jobEscrow, "JobCompleted")
                .withArgs(jobId, true, PAYMENT_AMOUNT, executor.address);

            const job = await jobEscrow.getJob(jobId);
            expect(job.status).to.equal(3); // Completed

            // Executor should receive payment + collateral back
            const finalExecutorBalance = await ausdToken.balanceOf(executor.address);
            const expectedPayout = PAYMENT_AMOUNT + COLLATERAL_AMOUNT;
            expect(finalExecutorBalance - initialExecutorBalance).to.equal(expectedPayout);
        });

        it("Should update reputation on success", async function () {
            await jobEscrow.connect(executor).submitResult(jobId, EXPECTED_HASH);

            const executorInfo = await agentRegistry.getAgentInfo(executor.address);
            expect(executorInfo.reputationScore).to.equal(5); // REPUTATION_SUCCESS
            expect(executorInfo.totalJobsCompleted).to.equal(1);
            expect(executorInfo.totalEarned).to.equal(PAYMENT_AMOUNT);
        });

        it("Should fail job with mismatched hash", async function () {
            const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong result"));
            const initialPosterBalance = await ausdToken.balanceOf(poster.address);

            await expect(jobEscrow.connect(executor).submitResult(jobId, wrongHash))
                .to.emit(jobEscrow, "JobFailed")
                .withArgs(jobId, "Hash mismatch", COLLATERAL_AMOUNT);

            const job = await jobEscrow.getJob(jobId);
            expect(job.status).to.equal(4); // Failed

            // Poster should receive payment + slashed collateral
            const finalPosterBalance = await ausdToken.balanceOf(poster.address);
            const expectedRefund = PAYMENT_AMOUNT + COLLATERAL_AMOUNT;
            expect(finalPosterBalance - initialPosterBalance).to.equal(expectedRefund);
        });

        it("Should update reputation on failure", async function () {
            const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong result"));

            await jobEscrow.connect(executor).submitResult(jobId, wrongHash);

            const executorInfo = await agentRegistry.getAgentInfo(executor.address);
            expect(executorInfo.reputationScore).to.equal(-10); // REPUTATION_FAILURE
            expect(executorInfo.totalJobsCompleted).to.equal(0);
            expect(executorInfo.totalEarned).to.equal(0);
        });

        it("Should fail if not executor", async function () {
            await expect(
                jobEscrow.connect(other).submitResult(jobId, EXPECTED_HASH)
            ).to.be.revertedWith("Only executor");
        });

        it("Should fail if job not accepted", async function () {
            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );
            const newJobId = 2;

            await expect(
                jobEscrow.connect(executor).submitResult(newJobId, EXPECTED_HASH)
            ).to.be.revertedWith("Only executor");
        });

        it("Should fail if deadline passed", async function () {
            await time.increase(DEADLINE_MINUTES * 60 + 1);

            await expect(
                jobEscrow.connect(executor).submitResult(jobId, EXPECTED_HASH)
            ).to.be.revertedWith("Deadline passed");
        });
    });

    describe("Job Cancellation", function () {
        let jobId;

        beforeEach(async function () {
            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );
            jobId = 1;
        });

        it("Should cancel pending job", async function () {
            const initialBalance = await ausdToken.balanceOf(poster.address);

            await expect(jobEscrow.connect(poster).cancelJob(jobId))
                .to.emit(jobEscrow, "JobCancelled")
                .withArgs(jobId, poster.address, PAYMENT_AMOUNT);

            const job = await jobEscrow.getJob(jobId);
            expect(job.status).to.equal(5); // Cancelled

            // Poster should get refund
            const finalBalance = await ausdToken.balanceOf(poster.address);
            expect(finalBalance - initialBalance).to.equal(PAYMENT_AMOUNT);
        });

        it("Should fail if not poster", async function () {
            await expect(
                jobEscrow.connect(executor).cancelJob(jobId)
            ).to.be.revertedWith("Only poster");
        });

        it("Should fail if job already accepted", async function () {
            await jobEscrow.connect(executor).acceptJob(jobId);

            await expect(
                jobEscrow.connect(poster).cancelJob(jobId)
            ).to.be.revertedWith("Can only cancel pending jobs");
        });
    });

    describe("Timeout Claims", function () {
        let jobId;

        beforeEach(async function () {
            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );
            jobId = 1;
            await jobEscrow.connect(executor).acceptJob(jobId);
        });

        it("Should claim timeout after deadline", async function () {
            await time.increase(DEADLINE_MINUTES * 60 + 1);

            const initialBalance = await ausdToken.balanceOf(poster.address);

            await expect(jobEscrow.connect(poster).claimTimeout(jobId))
                .to.emit(jobEscrow, "JobFailed")
                .withArgs(jobId, "Deadline exceeded", COLLATERAL_AMOUNT);

            const job = await jobEscrow.getJob(jobId);
            expect(job.status).to.equal(4); // Failed

            // Poster gets payment + slashed collateral
            const finalBalance = await ausdToken.balanceOf(poster.address);
            const expectedRefund = PAYMENT_AMOUNT + COLLATERAL_AMOUNT;
            expect(finalBalance - initialBalance).to.equal(expectedRefund);
        });

        it("Should update reputation on timeout", async function () {
            await time.increase(DEADLINE_MINUTES * 60 + 1);
            await jobEscrow.connect(poster).claimTimeout(jobId);

            const executorInfo = await agentRegistry.getAgentInfo(executor.address);
            expect(executorInfo.reputationScore).to.equal(-10); // REPUTATION_FAILURE
        });

        it("Should fail if deadline not passed", async function () {
            await expect(
                jobEscrow.connect(poster).claimTimeout(jobId)
            ).to.be.revertedWith("Deadline not passed");
        });

        it("Should fail if not poster", async function () {
            await time.increase(DEADLINE_MINUTES * 60 + 1);

            await expect(
                jobEscrow.connect(executor).claimTimeout(jobId)
            ).to.be.revertedWith("Only poster");
        });

        it("Should fail if job not in accepted state", async function () {
            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );
            const newJobId = 2;

            await time.increase(DEADLINE_MINUTES * 60 + 1);

            await expect(
                jobEscrow.connect(poster).claimTimeout(newJobId)
            ).to.be.revertedWith("Job not in accepted state");
        });
    });

    describe("Multiple Jobs", function () {
        it("Should handle multiple jobs correctly", async function () {
            // Post 3 jobs
            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );

            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );

            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES
                );

            expect(await jobEscrow.getTotalJobs()).to.equal(3);

            // Accept and complete job 1
            await jobEscrow.connect(executor).acceptJob(1);
            await jobEscrow.connect(executor).submitResult(1, EXPECTED_HASH);

            // Accept and fail job 2
            await jobEscrow.connect(executor).acceptJob(2);
            const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong"));
            await jobEscrow.connect(executor).submitResult(2, wrongHash);

            // Cancel job 3
            await jobEscrow.connect(poster).cancelJob(3);

            const job1 = await jobEscrow.getJob(1);
            const job2 = await jobEscrow.getJob(2);
            const job3 = await jobEscrow.getJob(3);

            expect(job1.status).to.equal(3); // Completed
            expect(job2.status).to.equal(4); // Failed
            expect(job3.status).to.equal(5); // Cancelled
        });
    });
});
