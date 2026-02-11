const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("JobEscrow", function () {
    let jobEscrow;
    let agentRegistry;
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

        // Deploy AgentRegistry
        const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy();
        await agentRegistry.waitForDeployment();

        // Deploy JobEscrow
        const JobEscrow = await ethers.getContractFactory("JobEscrow");
        jobEscrow = await JobEscrow.deploy(
            await agentRegistry.getAddress()
        );
        await jobEscrow.waitForDeployment();

        // Authorize JobEscrow in AgentRegistry
        await agentRegistry.authorizeContract(await jobEscrow.getAddress());

        // Register agents
        await agentRegistry.connect(poster).registerAgent(["research"]);
        await agentRegistry.connect(executor).registerAgent([CAPABILITY]);
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
                        DEADLINE_MINUTES,
                        { value: PAYMENT_AMOUNT }
                    )
            ).to.emit(jobEscrow, "JobPosted");

            const job = await jobEscrow.jobs(1);
            expect(job.poster).to.equal(poster.address);
            expect(job.payment).to.equal(PAYMENT_AMOUNT);
            expect(job.collateral).to.equal(COLLATERAL_AMOUNT);
            expect(job.expectedHash).to.equal(EXPECTED_HASH);
            expect(job.status).to.equal(0); // Pending
        });

        it("Should held payment in escrow", async function () {
            const initialBalance = await ethers.provider.getBalance(await jobEscrow.getAddress());

            await jobEscrow
                .connect(poster)
                .postJob(
                    EXPECTED_HASH,
                    PAYMENT_AMOUNT,
                    COLLATERAL_AMOUNT,
                    CAPABILITY,
                    DEADLINE_MINUTES,
                    { value: PAYMENT_AMOUNT }
                );

            const finalBalance = await ethers.provider.getBalance(await jobEscrow.getAddress());
            expect(finalBalance - initialBalance).to.equal(PAYMENT_AMOUNT);
        });

        it("Should fail if msg.value != payment", async function () {
            await expect(
                jobEscrow
                    .connect(poster)
                    .postJob(
                        EXPECTED_HASH,
                        PAYMENT_AMOUNT,
                        COLLATERAL_AMOUNT,
                        CAPABILITY,
                        DEADLINE_MINUTES,
                        { value: PAYMENT_AMOUNT - 1n }
                    )
            ).to.be.revertedWith("Must send exact payment");
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
                        DEADLINE_MINUTES,
                        { value: PAYMENT_AMOUNT }
                    )
            ).to.be.revertedWith("Invalid hash");
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
                        DEADLINE_MINUTES,
                        { value: PAYMENT_AMOUNT }
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
                    DEADLINE_MINUTES,
                    { value: PAYMENT_AMOUNT }
                );
            jobId = 1;
        });

        it("Should accept a job successfully", async function () {
            await expect(jobEscrow.connect(executor).acceptJob(jobId, { value: COLLATERAL_AMOUNT }))
                .to.emit(jobEscrow, "JobAccepted")
                .withArgs(jobId, executor.address, COLLATERAL_AMOUNT);

            const job = await jobEscrow.jobs(jobId);
            expect(job.executor).to.equal(executor.address);
            expect(job.status).to.equal(1); // Accepted
        });

        it("Should receive collateral in escrow", async function () {
            const initialBalance = await ethers.provider.getBalance(await jobEscrow.getAddress());

            await jobEscrow.connect(executor).acceptJob(jobId, { value: COLLATERAL_AMOUNT });

            const finalBalance = await ethers.provider.getBalance(await jobEscrow.getAddress());
            expect(finalBalance - initialBalance).to.equal(COLLATERAL_AMOUNT);
        });

        it("Should fail if msg.value != collateral", async function () {
            await expect(
                jobEscrow.connect(executor).acceptJob(jobId, { value: COLLATERAL_AMOUNT - 1n })
            ).to.be.revertedWith("Must send exact collateral");
        });

        it("Should fail if job not pending", async function () {
            await jobEscrow.connect(executor).acceptJob(jobId, { value: COLLATERAL_AMOUNT });

            await expect(
                jobEscrow.connect(other).acceptJob(jobId, { value: COLLATERAL_AMOUNT })
            ).to.be.revertedWith("Job not available");
        });

        it("Should fail if accepting own job", async function () {
            await expect(
                jobEscrow.connect(poster).acceptJob(jobId, { value: COLLATERAL_AMOUNT })
            ).to.be.revertedWith("Cannot accept own job");
        });

        it("Should fail if deadline passed", async function () {
            await time.increase(DEADLINE_MINUTES * 60 + 1);

            await expect(
                jobEscrow.connect(executor).acceptJob(jobId, { value: COLLATERAL_AMOUNT })
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
                    DEADLINE_MINUTES,
                    { value: PAYMENT_AMOUNT }
                );
            jobId = 1;
            await jobEscrow.connect(executor).acceptJob(jobId, { value: COLLATERAL_AMOUNT });
        });

        it("Should complete job with matching hash", async function () {
            const initialExecutorBalance = await ethers.provider.getBalance(executor.address);

            const tx = await jobEscrow.connect(executor).submitResult(jobId, EXPECTED_HASH);
            const receipt = await tx.wait();
            const gasUsage = receipt.gasUsed * receipt.gasPrice;

            await expect(tx)
                .to.emit(jobEscrow, "JobSubmitted")
                .withArgs(jobId, executor.address, EXPECTED_HASH)
                .and.to.emit(jobEscrow, "JobCompleted")
                .withArgs(jobId, true, PAYMENT_AMOUNT, executor.address);

            const job = await jobEscrow.jobs(jobId);
            expect(job.status).to.equal(3); // Completed

            // Executor should receive payment + collateral back
            const finalExecutorBalance = await ethers.provider.getBalance(executor.address);
            const expectedPayout = PAYMENT_AMOUNT + COLLATERAL_AMOUNT;
            expect(finalExecutorBalance - initialExecutorBalance + gasUsage).to.equal(expectedPayout);
        });

        it("Should fail job with mismatched hash and refund poster", async function () {
            const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong result"));
            const initialPosterBalance = await ethers.provider.getBalance(poster.address);

            await expect(jobEscrow.connect(executor).submitResult(jobId, wrongHash))
                .to.emit(jobEscrow, "JobFailed")
                .withArgs(jobId, "Hash mismatch", COLLATERAL_AMOUNT);

            const job = await jobEscrow.jobs(jobId);
            expect(job.status).to.equal(4); // Failed

            // Poster should receive payment + slashed collateral
            const finalPosterBalance = await ethers.provider.getBalance(poster.address);
            const expectedRefund = PAYMENT_AMOUNT + COLLATERAL_AMOUNT;
            // poster might have paid gas if they were the ones calling, but executor called here
            expect(finalPosterBalance - initialPosterBalance).to.equal(expectedRefund);
        });

        it("Should update reputation on success", async function () {
            await jobEscrow.connect(executor).submitResult(jobId, EXPECTED_HASH);

            const executorInfo = await agentRegistry.getAgentInfo(executor.address);
            expect(executorInfo.reputationScore).to.equal(5); // REPUTATION_SUCCESS
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
                    DEADLINE_MINUTES,
                    { value: PAYMENT_AMOUNT }
                );
            jobId = 1;
        });

        it("Should cancel pending job and refund poster", async function () {
            const initialBalance = await ethers.provider.getBalance(poster.address);

            const tx = await jobEscrow.connect(poster).cancelJob(jobId);
            const receipt = await tx.wait();
            const gasUsage = receipt.gasUsed * receipt.gasPrice;

            await expect(tx)
                .to.emit(jobEscrow, "JobCancelled")
                .withArgs(jobId, poster.address, PAYMENT_AMOUNT);

            const job = await jobEscrow.jobs(jobId);
            expect(job.status).to.equal(5); // Cancelled

            const finalBalance = await ethers.provider.getBalance(poster.address);
            expect(finalBalance - initialBalance + gasUsage).to.equal(PAYMENT_AMOUNT);
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
                    DEADLINE_MINUTES,
                    { value: PAYMENT_AMOUNT }
                );
            jobId = 1;
            await jobEscrow.connect(executor).acceptJob(jobId, { value: COLLATERAL_AMOUNT });
        });

        it("Should claim timeout after deadline", async function () {
            await time.increase(DEADLINE_MINUTES * 60 + 1);

            const initialBalance = await ethers.provider.getBalance(poster.address);
            const tx = await jobEscrow.connect(poster).claimTimeout(jobId);
            const receipt = await tx.wait();
            const gasUsage = receipt.gasUsed * receipt.gasPrice;

            await expect(tx)
                .to.emit(jobEscrow, "JobFailed")
                .withArgs(jobId, "Deadline exceeded", COLLATERAL_AMOUNT);

            const job = await jobEscrow.jobs(jobId);
            expect(job.status).to.equal(4); // Failed

            const finalBalance = await ethers.provider.getBalance(poster.address);
            const expectedRefund = PAYMENT_AMOUNT + COLLATERAL_AMOUNT;
            expect(finalBalance - initialBalance + gasUsage).to.equal(expectedRefund);
        });
    });
});
