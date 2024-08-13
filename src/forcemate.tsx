import { Move, PieceType, ShortMove, Square } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Piece } from "react-chessboard/dist/chessboard/types";
/** @ts-expect-error : import chess.js manually since I need to modifiy it */
import { Chess, SQUARES } from "./lib/chess.js@0.13.4/chess.js";

const DEBUG = false;
const TIMEOUT = 200;

export default function Forcemate() {
  const [game, setGame] = useState(new Chess());
  const [status, setStatus] = useState<
    | "selectA"
    | "moveA"
    | "selectB"
    | "moveB"
    | "over-win"
    | "over-draw"
    | "over-lose"
  >("selectA");
  const [selectedSquare, setSelectedSquare] = useState<Square>();
  const [showModal, setShowModal] = useState<
    "rule" | "patch" | "contact" | null
  >(null);

  const makeMove = useCallback(
    (move: ShortMove) => {
      console.assert(move.from === selectedSquare);
      const gameCopy = { ...game };
      const result = gameCopy.move(move); // Convert this <-> next
      if (result === null) {
        // Illegal move
        return false;
      } else {
        setGame(gameCopy);
        return true;
      }
    },
    [game, selectedSquare]
  );

  const thisSquares = useMemo((): Square[] => {
    return SQUARES.filter((square: Square) => {
      const piece = game.get(square);
      const moves = game.moves({ legal: false, square });
      return piece && piece.color === game.turn() && moves.length > 0;
    });
  }, [game]);
  const nextKing = useMemo(
    (): Square =>
      SQUARES.find((square: Square) => {
        const piece = game.get(square);
        return piece && piece.type === "k" && piece.color !== game.turn();
      })!,
    [game]
  );
  const legalThisSquares = useMemo((): Square[] => {
    return thisSquares.filter((square) => {
      const moves = game.moves({ legal: false, verbose: true, square });
      const existCheckMoves = moves.filter(
        (move: Move) => move.to === nextKing
      );
      return existCheckMoves.length === 0;
    });
  }, [game, thisSquares, nextKing]);

  const selectSquare = useCallback(
    (square: Square) => {
      console.assert(legalThisSquares.includes(square));
      setSelectedSquare(square);
    },
    [legalThisSquares]
  );

  useEffect(() => {
    switch (status) {
      case "selectA": {
        if (thisSquares.length === 0) {
          setStatus("over-draw");
          break;
        }
        if (legalThisSquares.length === 0) {
          setStatus("over-win");
          break;
        }
        if (DEBUG) console.log("selectA", legalThisSquares);
        const randomIndex = Math.floor(Math.random() * legalThisSquares.length);
        selectSquare(legalThisSquares[randomIndex]);
        setStatus("moveA");
        break;
      }
      case "moveB": {
        const possibleMoves = game.moves({
          legal: false,
          verbose: true,
          square: selectedSquare,
        });
        if (DEBUG) console.log("moveB", possibleMoves);
        console.assert(possibleMoves.length > 0);
        const randomIndex = Math.floor(Math.random() * possibleMoves.length);
        const move = possibleMoves[randomIndex];
        setTimeout(() => {
          makeMove(move);
          setStatus("selectA");
        }, TIMEOUT);
        break;
      }
      case "selectB": {
        if (thisSquares.length === 0) {
          setStatus("over-draw");
        } else if (legalThisSquares.length === 0) {
          setStatus("over-lose");
        }
        break;
      }
      case "over-lose": {
        setTimeout(() => {
          alert("You lose! 😂");
        }, TIMEOUT);
        break;
      }
      case "over-draw": {
        setTimeout(() => {
          alert("Draw! 🤝");
        }, TIMEOUT);
        break;
      }
      case "over-win": {
        setTimeout(() => {
          alert("You win! 🎉");
        }, TIMEOUT);
        break;
      }
    }
  }, [
    game,
    status,
    selectedSquare,
    thisSquares,
    legalThisSquares,
    makeMove,
    selectSquare,
    nextKing,
  ]);

  const onDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square, piece: Piece): boolean => {
      if (status !== "moveA") return false;
      const possibleMoves = game.moves({
        legal: false,
        verbose: true,
        square: selectedSquare,
      });
      if (DEBUG) console.log("moveA", possibleMoves);
      console.assert(possibleMoves.length > 0);
      const shortMove: ShortMove = {
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1] as Exclude<PieceType, "p" | "k">,
      };
      const move = possibleMoves.find(
        (m: Move) => m.from === shortMove.from && m.to === shortMove.to
      );
      if (move === undefined) return false;

      makeMove(move);
      setStatus("selectB");
      return true;
    },
    [game, status, selectedSquare, makeMove]
  );

  const onSquareClick = useCallback(
    (square: Square): boolean => {
      if (status !== "selectB") return false;
      if (DEBUG) console.log("selectB", legalThisSquares);
      if (!legalThisSquares.includes(square)) return false;
      selectSquare(square);
      setStatus("moveB");
      return true;
    },
    [status, legalThisSquares, selectSquare]
  );

  return (
    <div
      style={{
        margin: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "calc(min(100vw, 100vh)*0.7)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "16px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <h2 style={{ margin: "auto" }}>
            <b>ForceMate</b>
          </h2>
        </div>
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          customSquareStyles={{
            [selectedSquare as string]: {
              backgroundColor: "rgba(255, 255, 0, 0.5)",
            },
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "16px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ margin: "auto" }}>
            {status === "moveA" ? "Move highlighted your piece" : null}
            {status === "selectB" ? "Select one of opponent's piece" : null}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "16px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <span
              onClick={() => setShowModal("rule")}
              style={{ textDecoration: "underline", cursor: "pointer" }}
            >
              Rule
            </span>
            <span
              onClick={() => setShowModal("patch")}
              style={{ textDecoration: "underline", cursor: "pointer" }}
            >
              Patch
            </span>
            <span
              onClick={() => setShowModal("contact")}
              style={{ textDecoration: "underline", cursor: "pointer" }}
            >
              Bug or new idea?
            </span>
          </div>
          <div>Made with ❤️ for ♟️</div>
        </div>
      </div>
      {showModal === "rule" && (
        <div
          onClick={() => setShowModal(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p>
            In <b>normal</b> chess, <i>you</i> choose a piece and move it.
          </p>
          <p>
            In <b>ForceMate</b>, <i>your opponent </i> chooses a piece and you
            move it and vice versa.
          </p>
          <br />
          <p>If all your pieces check, you win.</p>
          <p>If no legal move left, you draw.</p>
          <br />
          <p>Have a fun!</p>
        </div>
      )}
      {showModal === "patch" && (
        <div
          onClick={() => setShowModal(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p>
            <b>Patch Note</b>
          </p>
          <br />
          <p>
            <b>2024-08-13</b> - v1.0
          </p>
          <p>First version with basic rule</p>
        </div>
      )}
      {showModal === "contact" && (
        <div
          onClick={() => setShowModal(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p>To report bug or share ideas, please contact me</p>
          <br />
          <p>jeukhwang.dev (here goes at) gmail (here goes dot) com</p>
        </div>
      )}
    </div>
  );
}
