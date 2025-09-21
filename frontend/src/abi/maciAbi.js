// ABI mínimo de ejemplo para MACI (debes reemplazarlo por el ABI real de tu contrato MACI)
export const maciAbi = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "pubKey", "type": "uint256" },
      { "internalType": "string", "name": "vote", "type": "string" }
    ],
    "name": "publishMessage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
