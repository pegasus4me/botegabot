const { ethers } = require('ethers');
const config = require('./env');

// ABIs - will be copied from core/artifacts
const AgentRegistryABI = require('../../abis/AgentRegistry.json');
const JobEscrowABI = require('../../abis/JobEscrow.json');
const ERC20ABI = require('../../abis/IERC20.json');

// Provider
const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);

// Contract instances (read-only)
const agentRegistry = new ethers.Contract(
    config.blockchain.contracts.agentRegistry,
    AgentRegistryABI.abi,
    provider
);

const jobEscrow = new ethers.Contract(
    config.blockchain.contracts.jobEscrow,
    JobEscrowABI.abi,
    provider
);

const ausdToken = new ethers.Contract(
    config.blockchain.contracts.ausdToken,
    ERC20ABI.abi,
    provider
);

// Helper to get signer for a specific wallet
function getSigner(privateKey) {
    return new ethers.Wallet(privateKey, provider);
}

// Helper to get contract with signer
function getContractWithSigner(contractAddress, abi, signer) {
    return new ethers.Contract(contractAddress, abi, signer);
}

module.exports = {
    provider,
    agentRegistry,
    jobEscrow,
    ausdToken,
    getSigner,
    getContractWithSigner,
    contracts: {
        agentRegistryAddress: config.blockchain.contracts.agentRegistry,
        jobEscrowAddress: config.blockchain.contracts.jobEscrow,
        ausdTokenAddress: config.blockchain.contracts.ausdToken
    }
};
