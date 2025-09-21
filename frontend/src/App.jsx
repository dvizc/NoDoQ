import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { maciAbi } from "./abi/maciAbi";
import { motion } from "framer-motion";
import VoteForm from "./components/VoteForm";

import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";

// Función para generar identidad, registrar identityCommitment, obtener Merkle root y generar prueba ZK real
async function validateCedulaParroquia(cedula, parroquia) {
  // 1. Generar identidad ZK (en un caso real, esto debería persistir en el navegador)
  const identity = new Identity(cedula + parroquia);
  const identityCommitment = identity.generateCommitment().toString();

  // 2. Registrar identityCommitment en el grupo de la parroquia
  await fetch("/api/register-identity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parroquia, identityCommitment }),
  });

  // 3. Obtener el Merkle root real del grupo
  const rootRes = await fetch(`/api/merkle-root/${encodeURIComponent(parroquia)}`);
  const rootData = await rootRes.json();
  const merkleRoot = rootData.merkleRoot;

  // 4. Obtener los miembros del grupo (identityCommitments) para la parroquia
  // (En un caso real, deberías tener un endpoint que devuelva los miembros del grupo)
  // Aquí simulamos con solo el identityCommitment actual
  const members = [identityCommitment];

  // 5. Crear el grupo Semaphore localmente
  const { Group } = await import("@semaphore-protocol/group");
  const group = new Group();
  members.forEach((m) => group.addMember(m));

  // 6. Generar la señal (signal) para la prueba ZK
  const signal = cedula; // o el mensaje que se use como señal

  // 7. Generar la prueba ZK real
  let proof;
  try {
    proof = await generateProof(identity, group, merkleRoot, signal);
  } catch (e) {
    return { valid: false, error: "Error generando la prueba ZK: " + e.message };
  }

  // 8. Enviar todo al backend
  const res = await fetch("/api/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula, parroquia, identityCommitment, proof, merkleRoot }),
  });
  return await res.json();
}

// Función para registrar usuario en MACI
async function registerMaciUser(cedula) {
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula }),
  });
  return await res.json();
}

// Función para enviar voto a MACI usando MetaMask y el ABI real
async function sendMaciVoteWithMetaMask(pubKey, voto) {
  // Reemplaza por la dirección real del contrato MACI
  const MACI_ADDRESS = "0xYourMaciAddress";
  if (!window.ethereum) throw new Error("MetaMask no detectado");
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const maciContract = new ethers.Contract(MACI_ADDRESS, maciAbi, signer);

  // Llama a la función publishMessage del contrato MACI
  try {
    const tx = await maciContract.publishMessage(pubKey, voto);
    await tx.wait();
    return { message: "Voto enviado a MACI correctamente" };
  } catch (e) {
    throw new Error("Error al enviar el voto a MACI: " + e.message);
  }
}

function App() {
  const [greeting, setGreeting] = useState("Bienvenido a las Votaciones de Quito");
  const [account, setAccount] = useState(null);

  // Conexión a MetaMask manual
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
        setGreeting("✅ MetaMask conectado correctamente");
      } catch (err) {
        setGreeting("❌ MetaMask: Acceso denegado o no disponible");
      }
    } else {
      setGreeting("❌ MetaMask no está instalado");
    }
  };

  // Estado de votos
  const [votes, setVotes] = useState({
    "Candidato A 🟢": 0,
    "Candidato B 🔵": 0,
    "Candidato C 🔴": 0,
  });

  // Registro de cédulas que ya votaron
  const [voters, setVoters] = useState({});

  const handleVote = async (cedula, parroquia, candidate) => {
    if (!account) {
      setGreeting("⚠️ Debes conectar tu cuenta de MetaMask para votar.");
      return;
    }
    if (voters[cedula]) {
      setGreeting(`⚠️ La cédula ${cedula} ya ha votado. Solo se permite un voto por persona.`);
      return;
    }

    setGreeting("⏳ Validando cédula y parroquia...");
    const validRes = await validateCedulaParroquia(cedula, parroquia);
    if (!validRes.valid) {
      setGreeting(`❌ Error: ${validRes.error || "La cédula no pertenece a la parroquia seleccionada."}`);
      return;
    }

    setGreeting("✅ Cédula y parroquia validadas. Registrando usuario en MACI...");
    const reg = await registerMaciUser(cedula);
    if (!reg.pubKey) {
      setGreeting("❌ Error registrando usuario en MACI. Intenta de nuevo más tarde.");
      return;
    }

    setGreeting("🔐 Usuario registrado en MACI. Firmando y enviando voto con MetaMask...");
    let voteRes;
    try {
      voteRes = await sendMaciVoteWithMetaMask(reg.pubKey, candidate);
    } catch (e) {
      setGreeting("❌ Error al firmar/enviar el voto con MetaMask: " + e.message);
      return;
    }
    if (!voteRes.message) {
      setGreeting("❌ Error al enviar el voto a MACI. Intenta de nuevo.");
      return;
    }

    setVotes((prev) => ({
      ...prev,
      [candidate]: prev[candidate] + 1,
    }));
    setVoters((prev) => ({
      ...prev,
      [cedula]: { parroquia, candidate },
    }));
    setGreeting(
      `🎉 ¡Voto registrado exitosamente y de forma privada para ${candidate} desde la parroquia ${parroquia}!\n\n(MACI + Semaphore simulado)`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400 flex flex-col items-center justify-center p-6">
      {/* MetaMask info */}
      <div className="mb-2 text-sm text-gray-800 flex flex-col items-center gap-2">
        {account ? (
          <span>🦊 Conectado con MetaMask: {account}</span>
        ) : (
          <button
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded shadow"
            onClick={connectWallet}
          >
            Conectar con MetaMask
          </button>
        )}
      </div>
      {/* Header */}
      <motion.h1
        className="text-5xl font-extrabold text-white drop-shadow-lg mb-10 text-center"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        🗳️ Votaciones On-Chain Ecuador <br />
        <span className="text-yellow-200">Votaciones para Alcalde</span>
      </motion.h1>

      {/* Card principal */}
      <motion.div
        className="w-full max-w-3xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 flex flex-col items-center">
          <p className="text-xl text-gray-700 font-medium mb-6 text-center">
            {greeting}
          </p>

          <VoteForm onVote={handleVote} />

          {/* Resultados en tiempo real */}
          <div className="mt-8 w-full">
            <h2 className="text-2xl font-bold text-purple-700 text-center mb-4">
              📊 Resultados en tiempo real
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(votes).map(([candidate, count]) => (
                <motion.div
                  key={candidate}
                  className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 p-4 rounded-xl shadow-md text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <p className="text-lg font-semibold">{candidate}</p>
                  <p className="text-3xl font-bold text-purple-800">{count}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="mt-10 text-white text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
      </motion.footer>
    </div>
  );
}

export default App;
// ...existing code...
