import { useState } from "react";
import { generateProof, packToSolidityProof } from "@semaphore-protocol/proof";
import { Identity } from "@semaphore-protocol/identity";
import { ethers } from "ethers";
import semaphoreVotingAbi from "../abi/SemaphoreVoting.json";

const CONTRACT_ADDRESS = "DIRECCION_DEL_CONTRATO"; // Cambia por la dirección real

export default function VoteWithSemaphoreZK() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [signal, setSignal] = useState("");
  const [group, setGroup] = useState(null); // Debes cargar el grupo real
  const [externalNullifier, setExternalNullifier] = useState("");

  // Demo: identidad generada localmente (en producción, guardar en localStorage o backend)
  const [identity] = useState(new Identity("secreto del usuario"));

  const connectWallet = async () => {
    if (window.ethereum) {
      const [selectedAccount] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(selectedAccount);
    } else {
      setStatus("MetaMask no está instalado");
    }
  };

  const vote = async () => {
    setStatus("Generando prueba ZK...");
    try {
      // Debes cargar el grupo real y los archivos wasm/zkey desde el servidor o public
      if (!group) throw new Error("Debes cargar el grupo");
      const fullProof = await generateProof(
        identity,
        group,
        externalNullifier,
        signal,
        {
          zkeyFilePath: "/zk-proofs/circuits/semaphore.zkey",
          wasmFilePath: "/zk-proofs/circuits/semaphore.wasm"
        }
      );
      const solidityProof = packToSolidityProof(fullProof.proof);
      setStatus("Enviando transacción...");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, semaphoreVotingAbi, signer);
      const tx = await contract.vote(
        group.id,
        ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(signal))),
        fullProof.publicSignals.nullifierHash,
        externalNullifier,
        solidityProof
      );
      setTxHash(tx.hash);
      setStatus("Voto enviado correctamente");
    } catch (err) {
      setStatus("Error: " + err.message);
    }
  };

  return (
    <div className="p-4 border rounded">
      <button onClick={connectWallet} className="btn btn-primary mb-2">
        {account ? `Conectado: ${account}` : "Conectar MetaMask"}
      </button>
      <div className="mb-2">
        <input placeholder="signal" value={signal} onChange={e => setSignal(e.target.value)} />
        <input placeholder="externalNullifier" value={externalNullifier} onChange={e => setExternalNullifier(e.target.value)} />
        {/* Aquí deberías cargar el grupo real y setGroup */}
      </div>
      <button onClick={vote} className="btn btn-success">Votar (ZK)</button>
      <div className="mt-2">{status}</div>
      {txHash && <div>Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a></div>}
    </div>
  );
}
