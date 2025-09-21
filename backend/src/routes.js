// --- Conexión a contratos Semaphore y MACI usando ethers.js ---
const { JsonRpcProvider, Wallet, Contract, id } = require("ethers");
// Reemplaza por la URL de tu nodo local o testnet
const provider = new JsonRpcProvider("http://localhost:8545");

// Reemplaza por las direcciones reales tras el despliegue
const SEMAPHORE_ADDRESS = "0xYourSemaphoreAddress";
const MACI_ADDRESS = "0xYourMaciAddress";

// Reemplaza por los ABI reales de los contratos
const semaphoreAbi = require("../../artifacts/contracts/Semaphore.sol/SemaphoreVoting.json").abi;
// const maciAbi = require("../../artifacts/contracts/PollFactory.sol/PollFactory.json").abi;

const semaphoreContract = new Contract(SEMAPHORE_ADDRESS, semaphoreAbi, provider);
// const maciContract = new ethers.Contract(MACI_ADDRESS, maciAbi, provider);

// Ejemplo: función para obtener el Merkle root real desde el contrato
async function getMerkleRootFromContract(parroquiaId) {
  // Debes adaptar esto según la lógica de tu contrato
  // return await semaphoreContract.getRoot(parroquiaId);
  return "0"; // Simulado
}
const express = require("express");
const fs = require("fs");
const path = require("path");
// const { Keypair } = require("maci-js"); // Descomenta si maci-js soporta uso directo en Node.js
const { generateProof, verifyProof, Semaphore } = require("@semaphore-protocol/proof");
const { Group } = require("@semaphore-protocol/group");

const router = express.Router();


// Cargar cédulas y parroquias
const cedulasPath = path.join(__dirname, "cedulas_parroquias.json");
const cedulasData = JSON.parse(fs.readFileSync(cedulasPath, "utf8"));

// Crear grupos de Semaphore por parroquia
const parroquias = [
  "Belisario Quevedo", "Carcelén", "Centro Histórico", "Chilibulo", "Chillogallo", "Chimbacalle", "Cochapamba", "Comité del Pueblo", "Concepción", "Cotocollao", "El Condado", "El Inca", "Guamaní", "Iñaquito", "Itchimbía", "Jipijapa", "Kennedy", "La Argelia", "La Ecuatoriana", "La Ferroviaria", "La Libertad", "La Mena", "Magdalena", "Mariscal Sucre", "Ponceano", "Puengasí", "Quitumbe", "Rumipamba", "San Bartolo", "San Juan", "Solanda"
];
const gruposSemaphore = {};
parroquias.forEach(parroquia => {
  gruposSemaphore[parroquia] = new Group();
});

// Agregar los identityCommitments de cada cédula a su grupo
// (En un flujo real, los identityCommitments se registrarían desde el frontend)
// Aquí solo inicializamos los grupos vacíos

// Utilidad: buscar parroquia de una cédula
function getParroquiaByCedula(cedula) {
  const entry = cedulasData.find((c) => c.cedula === cedula);
  return entry ? entry.parroquia : null;
}

// Endpoint para registrar identityCommitment en el contrato de Semaphore
router.post("/register-identity", async (req, res) => {
  const { parroquia, identityCommitment } = req.body;
  if (!parroquia || !identityCommitment) {
    return res.status(400).json({ error: "Parroquia e identityCommitment requeridos" });
  }
  // Aquí deberías mapear la parroquia a un groupId en el contrato
  const groupId = id(parroquia); // Ejemplo: hash de la parroquia
  try {
    // Para enviar una transacción necesitas un signer (cuenta con clave privada)
    // Aquí se asume que tienes una wallet configurada
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) return res.status(500).json({ error: "PRIVATE_KEY no configurada" });
  const wallet = new Wallet(privateKey, provider);
  const semaphoreWithSigner = semaphoreContract.connect(wallet);
    // Llama a la función del contrato para agregar el miembro
    const tx = await semaphoreWithSigner.addMember(groupId, identityCommitment);
    await tx.wait();
    res.json({ message: "IdentityCommitment registrado en contrato de Semaphore" });
  } catch (e) {
    res.status(500).json({ error: "Error al registrar en contrato: " + e.message });
  }
});

// Endpoint para obtener el Merkle root real del contrato de Semaphore
router.get("/merkle-root/:parroquia", async (req, res) => {
  const parroquia = req.params.parroquia;
  // Mapear parroquia a groupId
  const groupId = id(parroquia);
  try {
    const root = await semaphoreContract.getRoot(groupId);
    res.json({ merkleRoot: root.toString() });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo Merkle root del contrato: " + e.message });
  }
});

// Endpoint para validar cédula y parroquia usando Semaphore (ZK real)
router.post("/validate", async (req, res) => {
  const { cedula, parroquia, identityCommitment, proof, merkleRoot } = req.body;
  const parroquiaReal = getParroquiaByCedula(cedula);
  if (!parroquiaReal) {
    return res.status(404).json({ error: "Cédula no encontrada" });
  }
  if (parroquiaReal !== parroquia) {
    return res.status(400).json({ error: "La cédula no pertenece a la parroquia seleccionada" });
  }
  if (!gruposSemaphore[parroquia]) {
    return res.status(400).json({ error: "Parroquia no válida" });
  }
  // Verificar que el identityCommitment esté en el grupo
  if (!gruposSemaphore[parroquia].members.map(m=>m.toString()).includes(identityCommitment)) {
    return res.status(400).json({ error: "IdentityCommitment no registrado en el grupo de la parroquia" });
  }
  // Verificar la prueba ZK con verifyProof y el contrato de Semaphore
  try {
    // proof debe ser un objeto, merkleRoot un BigInt, y signal un string (por ejemplo, la cédula)
    // El frontend debe enviar la prueba real y la señal
    // const signal = cedula; // o el mensaje que se use como señal
    // const verified = await verifyProof(proof, BigInt(merkleRoot), signal);
    // if (!verified) throw new Error("Prueba ZK inválida");

    // Verificar que el Merkle root enviado corresponde al root on-chain
    const groupId = ethers.utils.id(parroquia);
  const rootOnChain = await semaphoreContract.getRoot(groupId);
    if (rootOnChain.toString() !== merkleRoot) {
      return res.status(400).json({ error: "El Merkle root no coincide con el del contrato" });
    }

    // Verificar la prueba ZK (usando verifyProof de Semaphore)
  const signal = cedula;
  const verified = await verifyProof(proof, BigInt(merkleRoot), signal);
    if (!verified) throw new Error("Prueba ZK inválida");
    res.json({ valid: true, parroquia });
  } catch (e) {
    res.status(400).json({ error: "Prueba ZK inválida o no verificada: " + e.message });
  }
});

// Endpoint para registrar usuario en MACI (simulado)
router.post("/register", (req, res) => {
  const { cedula } = req.body;
  // Aquí deberías usar Keypair.generate() de maci-js para crear la clave del votante
  // const keypair = Keypair.genKeypair();
  // const pubKey = keypair.pubKey.serialize();
  // const privKey = keypair.privKey.serialize();
  // Por ahora, simulamos:
  const pubKey = "PUBKEY_SIMULADA";
  const privKey = "PRIVKEY_SIMULADA";
  res.json({
    message: `Votante ${cedula} registrado en MACI.`,
    pubKey,
    privKey,
  });
});

// Endpoint para enviar voto cifrado a MACI (simulado)
router.post("/vote", (req, res) => {
  const { cedula, pubKey, voto } = req.body;
  // Aquí deberías construir y enviar el mensaje MACI usando maci-js
  // Por ahora, simulamos:
  res.json({
    message: `Voto recibido para cédula ${cedula} (simulado MACI)`,
    pubKey,
    voto,
  });
});

module.exports = router;
