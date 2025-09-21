const hre = require("hardhat");

async function main() {
    // Desplegar SemaphoreVerifier
    const Verifier = await hre.ethers.getContractFactory("SemaphoreVerifier");
    const verifier = await Verifier.deploy();
    await verifier.deployed();
    console.log("SemaphoreVerifier deployed to:", verifier.address);

    // Desplegar SemaphoreVoting con la dirección del verificador
    const Voting = await hre.ethers.getContractFactory("SemaphoreVoting");
    const voting = await Voting.deploy(verifier.address);
    await voting.deployed();
    console.log("SemaphoreVoting deployed to:", voting.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
