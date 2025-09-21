import { useState } from "react";
import { ethers } from "ethers";
// Importa el ABI de tu contrato
import semaphoreVotingAbi from "../abi/SemaphoreVoting.json";

const CONTRACT_ADDRESS = "DIRECCION_DEL_CONTRATO"; // Reemplaza por la dirección real

export default function VoteWithMetaMask() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");

  // Estos valores deben ser generados con la prueba ZK
  const [groupId, setGroupId] = useState("");
  const [signal, setSignal] = useState("");
  const [nullifierHash, setNullifierHash] = useState("");
  const [externalNullifier, setExternalNullifier] = useState("");
  const [proof, setProof] = useState(""); // Debe ser un array de 8 elementos

  const connectWallet = async () => {
    if (window.ethereum) {
      const [selectedAccount] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(selectedAccount);
    } else {
      setStatus("MetaMask no está instalado");
    }
  };

  const vote = async () => {
    setStatus("Enviando transacción...");
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, semaphoreVotingAbi, signer);
      const tx = await contract.vote(
        groupId,
        signal,
        nullifierHash,
        externalNullifier,
        proof // Debe ser un array tipo [a,b,c,d,e,f,g,h]
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
        <input placeholder="groupId" value={groupId} onChange={e => setGroupId(e.target.value)} />
        <input placeholder="signal" value={signal} onChange={e => setSignal(e.target.value)} />
        <input placeholder="nullifierHash" value={nullifierHash} onChange={e => setNullifierHash(e.target.value)} />
        <input placeholder="externalNullifier" value={externalNullifier} onChange={e => setExternalNullifier(e.target.value)} />
        <input placeholder="proof (JSON array)" value={proof} onChange={e => setProof(JSON.parse(e.target.value))} />
      </div>
      <button onClick={vote} className="btn btn-success">Votar</button>
      <div className="mt-2">{status}</div>
      {txHash && <div>Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a></div>}
    </div>
  );
}
