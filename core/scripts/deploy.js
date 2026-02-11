const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying Botegabot contracts to", hre.network.name);

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

    // Deploy AgentRegistry
    console.log("\n📦 Deploying AgentRegistry...");
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();
    const agentRegistryAddress = await agentRegistry.getAddress();

    console.log("✅ AgentRegistry deployed to:", agentRegistryAddress);

    // Deploy JobEscrow
    console.log("\n📦 Deploying JobEscrow...");
    const JobEscrow = await hre.ethers.getContractFactory("JobEscrow");
    const jobEscrow = await JobEscrow.deploy(agentRegistryAddress);
    await jobEscrow.waitForDeployment();
    const jobEscrowAddress = await jobEscrow.getAddress();

    console.log("✅ JobEscrow deployed to:", jobEscrowAddress);

    // Authorize JobEscrow to update reputation in AgentRegistry
    console.log("\n🔐 Authorizing JobEscrow in AgentRegistry...");
    const tx = await agentRegistry.authorizeContract(jobEscrowAddress);
    await tx.wait();
    console.log("✅ JobEscrow authorized");

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("Network:", hre.network.name);
    console.log("AgentRegistry:", agentRegistryAddress);
    console.log("JobEscrow:", jobEscrowAddress);
    console.log("Currency: Native MON (Gas Token)");
    console.log("=".repeat(60));

    // Save deployment addresses
    const fs = require("fs");
    const deploymentInfo = {
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        contracts: {
            AgentRegistry: agentRegistryAddress,
            JobEscrow: jobEscrowAddress
        },
        deployer: deployer.address
    };

    const filename = `deployment-${hre.network.name}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to ${filename}`);

    // Verification instructions
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n📋 To verify contracts on block explorer:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${agentRegistryAddress}`);
        console.log(`npx hardhat verify --network ${hre.network.name} ${jobEscrowAddress} ${agentRegistryAddress}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
