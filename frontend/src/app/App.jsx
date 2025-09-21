import { useState } from "react-is";
import VoteForm from "../components/VoteForm";
import VoteCotocollao from "../components/VoteCotocollao";

export default function App() {
  return (
    <div className="p-4">
      <h1>Votación Parroquia Cotocollao</h1>
      <VoteCotocollao />
      <VoteForm />
    </div>
  );
}
