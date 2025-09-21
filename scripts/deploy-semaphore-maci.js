// Script de despliegue de Semaphore y MACI en Hardhat
// Ejecuta: npx hardhat run scripts/deploy-semaphore-maci.js --network localhost

const { ethers } = require("hardhat");

async function main() {
  // Desplegar Semaphore
  const Semaphore = await ethers.getContractFactory("Semaphore");
  const semaphore = await Semaphore.deploy();
  await semaphore.deployed();
  console.log("Semaphore deployed to:", semaphore.address);

  // Desplegar MACI (ejemplo con PollFactory)
  // Requiere que hayas instalado @maci/contracts y copiado los contratos a tu proyecto
  // const PollFactory = await ethers.getContractFactory("PollFactory");
  // const pollFactory = await PollFactory.deploy();
  // await pollFactory.deployed();
  // console.log("MACI PollFactory deployed to:", pollFactory.address);

  // Puedes guardar las direcciones en un archivo para usarlas en backend/frontend
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
