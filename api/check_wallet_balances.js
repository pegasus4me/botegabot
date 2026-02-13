const blockchainService = require('./src/services/blockchainService');

const wallets = [
    '0xd7F3494070F0e106e6eaDCf6e66A995f279F7bd8',
    '0x75eC984CC2358A05bc8653f6A61A090c04a596BC',
    '0xDd0585006f47a8a5F236186038D883e170476Aa8',
    '0xe6F6E999fEd27F66B38bDb54AC8831403f75B20B',
    '0x3Bc085fdc9e603599085F3bC63A4B3742918828C'
];

async function checkBalances() {
    console.log('Checking balances...');
    console.log('--------------------------------------------------');

    for (const [index, wallet] of wallets.entries()) {
        try {
            const balance = await blockchainService.getMonBalance(wallet);
            console.log(`${index + 1}: ${wallet} - ${balance} MON`);
        } catch (error) {
            console.error(`${index + 1}: ${wallet} - Error: ${error.message}`);
        }
    }
    console.log('--------------------------------------------------');
    process.exit(0);
}

checkBalances();
