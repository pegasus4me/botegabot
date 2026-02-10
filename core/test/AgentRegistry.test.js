const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AgentRegistry", function () {
    let agentRegistry;
    let owner;
    let agent1;
    let agent2;
    let jobEscrow;

    beforeEach(async function () {
        [owner, agent1, agent2, jobEscrow] = await ethers.getSigners();

        const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy();
        await agentRegistry.waitForDeployment();
    });

    describe("Agent Registration", function () {
        it("Should register a new agent with capabilities", async function () {
            const capabilities = ["scraping", "parsing"];

            await expect(agentRegistry.connect(agent1).registerAgent(capabilities))
                .to.emit(agentRegistry, "AgentRegistered");

            expect(await agentRegistry.isRegistered(agent1.address)).to.be.true;
            expect(await agentRegistry.isAgentActive(agent1.address)).to.be.true;
        });

        it("Should fail to register with no capabilities", async function () {
            await expect(
                agentRegistry.connect(agent1).registerAgent([])
            ).to.be.revertedWith("Must have at least one capability");
        });

        it("Should fail to register twice", async function () {
            const capabilities = ["scraping"];
            await agentRegistry.connect(agent1).registerAgent(capabilities);

            await expect(
                agentRegistry.connect(agent1).registerAgent(capabilities)
            ).to.be.revertedWith("Already registered");
        });

        it("Should retrieve agent information correctly", async function () {
            const capabilities = ["scraping", "parsing", "analysis"];
            await agentRegistry.connect(agent1).registerAgent(capabilities);

            const agentInfo = await agentRegistry.getAgentInfo(agent1.address);

            expect(agentInfo.wallet).to.equal(agent1.address);
            expect(agentInfo.capabilities).to.deep.equal(capabilities);
            expect(agentInfo.reputationScore).to.equal(0);
            expect(agentInfo.totalJobsCompleted).to.equal(0);
            expect(agentInfo.totalJobsPosted).to.equal(0);
            expect(agentInfo.totalEarned).to.equal(0);
            expect(agentInfo.totalSpent).to.equal(0);
            expect(agentInfo.isActive).to.be.true;
        });
    });

    describe("Capability Updates", function () {
        beforeEach(async function () {
            await agentRegistry.connect(agent1).registerAgent(["scraping"]);
        });

        it("Should update agent capabilities", async function () {
            const newCapabilities = ["scraping", "parsing", "translation"];

            await expect(
                agentRegistry.connect(agent1).updateCapabilities(newCapabilities)
            )
                .to.emit(agentRegistry, "CapabilitiesUpdated");

            const agentInfo = await agentRegistry.getAgentInfo(agent1.address);
            expect(agentInfo.capabilities).to.deep.equal(newCapabilities);
        });

        it("Should fail to update with empty capabilities", async function () {
            await expect(
                agentRegistry.connect(agent1).updateCapabilities([])
            ).to.be.revertedWith("Must have at least one capability");
        });

        it("Should fail if agent not registered", async function () {
            await expect(
                agentRegistry.connect(agent2).updateCapabilities(["scraping"])
            ).to.be.revertedWith("Agent not registered");
        });
    });

    describe("Reputation System", function () {
        beforeEach(async function () {
            await agentRegistry.connect(agent1).registerAgent(["scraping"]);
            await agentRegistry.connect(owner).authorizeContract(jobEscrow.address);
        });

        it("Should update reputation by authorized contract", async function () {
            const delta = 5;

            await agentRegistry.connect(jobEscrow).updateReputation(agent1.address, delta);

            const agentInfo = await agentRegistry.getAgentInfo(agent1.address);
            expect(agentInfo.reputationScore).to.equal(delta);
        });

        it("Should handle negative reputation changes", async function () {
            // First add some positive reputation
            await agentRegistry.connect(jobEscrow).updateReputation(agent1.address, 10);

            // Then subtract
            await agentRegistry.connect(jobEscrow).updateReputation(agent1.address, -15);

            const agentInfo = await agentRegistry.getAgentInfo(agent1.address);
            expect(agentInfo.reputationScore).to.equal(-5);
        });

        it("Should fail if not authorized", async function () {
            await expect(
                agentRegistry.connect(agent2).updateReputation(agent1.address, 5)
            ).to.be.revertedWith("Not authorized");
        });

        it("Should fail for unregistered agent", async function () {
            await expect(
                agentRegistry.connect(jobEscrow).updateReputation(agent2.address, 5)
            ).to.be.revertedWith("Agent not registered");
        });
    });

    describe("Job Statistics", function () {
        beforeEach(async function () {
            await agentRegistry.connect(agent1).registerAgent(["scraping"]);
            await agentRegistry.connect(agent2).registerAgent(["parsing"]);
            await agentRegistry.connect(owner).authorizeContract(jobEscrow.address);
        });

        it("Should update job stats for successful job", async function () {
            const payment = ethers.parseEther("10");

            await agentRegistry
                .connect(jobEscrow)
                .updateJobStats(agent1.address, agent2.address, payment, true);

            const poster = await agentRegistry.getAgentInfo(agent1.address);
            const executor = await agentRegistry.getAgentInfo(agent2.address);

            expect(poster.totalJobsPosted).to.equal(1);
            expect(poster.totalSpent).to.equal(payment);

            expect(executor.totalJobsCompleted).to.equal(1);
            expect(executor.totalEarned).to.equal(payment);
        });

        it("Should update stats correctly for failed job", async function () {
            const payment = ethers.parseEther("10");

            await agentRegistry
                .connect(jobEscrow)
                .updateJobStats(agent1.address, agent2.address, payment, false);

            const poster = await agentRegistry.getAgentInfo(agent1.address);
            const executor = await agentRegistry.getAgentInfo(agent2.address);

            expect(poster.totalJobsPosted).to.equal(1);
            expect(poster.totalSpent).to.equal(payment);

            // Executor should not get credit for failed job
            expect(executor.totalJobsCompleted).to.equal(0);
            expect(executor.totalEarned).to.equal(0);
        });

        it("Should accumulate stats over multiple jobs", async function () {
            const payment1 = ethers.parseEther("10");
            const payment2 = ethers.parseEther("5");

            await agentRegistry
                .connect(jobEscrow)
                .updateJobStats(agent1.address, agent2.address, payment1, true);

            await agentRegistry
                .connect(jobEscrow)
                .updateJobStats(agent1.address, agent2.address, payment2, true);

            const executor = await agentRegistry.getAgentInfo(agent2.address);

            expect(executor.totalJobsCompleted).to.equal(2);
            expect(executor.totalEarned).to.equal(payment1 + payment2);
        });
    });

    describe("Authorization System", function () {
        it("Should authorize contract by owner", async function () {
            await agentRegistry.connect(owner).authorizeContract(jobEscrow.address);
            expect(await agentRegistry.authorizedContracts(jobEscrow.address)).to.be.true;
        });

        it("Should revoke contract authorization", async function () {
            await agentRegistry.connect(owner).authorizeContract(jobEscrow.address);
            await agentRegistry.connect(owner).revokeContractAuthorization(jobEscrow.address);
            expect(await agentRegistry.authorizedContracts(jobEscrow.address)).to.be.false;
        });

        it("Should fail to authorize if not owner", async function () {
            await expect(
                agentRegistry.connect(agent1).authorizeContract(jobEscrow.address)
            ).to.be.revertedWith("Only owner");
        });
    });

    describe("Agent Activation", function () {
        beforeEach(async function () {
            await agentRegistry.connect(agent1).registerAgent(["scraping"]);
        });

        it("Should deactivate agent", async function () {
            await agentRegistry.connect(agent1).deactivateAgent();
            expect(await agentRegistry.isAgentActive(agent1.address)).to.be.false;
        });

        it("Should reactivate agent", async function () {
            await agentRegistry.connect(agent1).deactivateAgent();
            await agentRegistry.connect(agent1).reactivateAgent();
            expect(await agentRegistry.isAgentActive(agent1.address)).to.be.true;
        });
    });
});
