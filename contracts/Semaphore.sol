// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@semaphore-protocol/contracts/Semaphore.sol";
import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";


contract SemaphoreVoting is Semaphore {
    event Voted(uint256 groupId, uint256 nullifierHash, uint256 signal);

    mapping(uint256 => bool) public nullifierHashes;

    constructor(ISemaphoreVerifier _verifier) Semaphore(_verifier) {}


    // Crea un grupo y asigna admin
    function createVotingGroup(address admin) external returns (uint256 groupId) {
        groupId = this.createGroup(admin);
    }

    // Agrega un miembro al grupo
    function addMemberToGroup(uint256 groupId, uint256 identityCommitment) external {
        this.addMember(groupId, identityCommitment);
    }

    // Votar usando prueba de Semaphore
    function vote(
        uint256 groupId,
        uint256 merkleTreeDepth,
        uint256 merkleTreeRoot,
        uint256 nullifier,
        uint256 message,
        uint256 scope,
        uint256[8] calldata points
    ) external {
        SemaphoreProof memory proof = SemaphoreProof({
            merkleTreeDepth: merkleTreeDepth,
            merkleTreeRoot: merkleTreeRoot,
            nullifier: nullifier,
            message: message,
            scope: scope,
            points: points
        });
        this.validateProof(groupId, proof);
        emit Voted(groupId, nullifier, message);
    }
}
