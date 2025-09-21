import { useState, useEffect } from "react";
import { Group } from "@semaphore-protocol/group";
import { generateProof, packToSolidityProof } from "@semaphore-protocol/proof";
import { Identity } from "@semaphore-protocol/identity";
import { ethers } from "ethers";
import semaphoreVotingAbi from "../abi/SemaphoreVoting.json";

const CONTRACT_ADDRESS = "0xeb4856b891d7B4100E33b13451e8b0722F73A04D";
const GRUPO_JSON = "/grupo_cotocollao.json";

export default function VoteCotocollao() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [signal, setSignal] = useState("");
  const [externalNullifier, setExternalNullifier] = useState("");
  const [group, setGroup] = useState(null);
  const [identity] = useState(new Identity("secreto del usuario"));

  useEffect(() => {
    fetch(GRUPO_JSON)
      .then(res => res.json())
      .then(data => {
        const g = new Group(data.id, data.depth, data.members);
        setGroup(g);
      });
  }, []);

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
      if (!group) throw new Error("Grupo no cargado");
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
      </div>
      <button onClick={vote} className="btn btn-success">Votar Cotocollao (ZK)</button>
      <div className="mt-2">{status}</div>
      {txHash && <div>Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a></div>}
    </div>
  );
}
