import { Move, PieceType, ShortMove, Square } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Piece } from "react-chessboard/dist/chessboard/types";
import "./Game.css";
/** @ts-expect-error : import chess.js manually since I need to modifiy it */
import { Chess, SQUARES } from "./lib/chess.js@0.13.4/chess.js";

const DEBUG = false;
const TIMEOUT = 200;

function Modal({
  visible,
  setInvisible,
  children,
}: {
  visible: boolean;
  setInvisible: () => void;
  children: React.ReactNode;
}) {
  return (
    visible && (
      <div
        onClick={setInvisible}
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
          lineHeight: 1.6,
        }}
      >
        <div
          className="board-size"
          style={{ boxSizing: "border-box", padding: "8px" }}
        >
          {children}
        </div>
      </div>
    )
  );
}

export default function Game() {
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
      <div className="board-size">
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
            {status === "moveA"
              ? "Move your highlighted piece"
              : status === "selectB"
              ? "Select one of your opponent's pieces"
              : "..."}
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
          <div>
            Made with <span className="tossface">❤️</span> for{" "}
            <span className="tossface">♟️</span>
          </div>
        </div>
      </div>
      <Modal
        visible={showModal === "rule"}
        setInvisible={() => setShowModal(null)}
      >
        <h3>
          <b>ForceMate, a chess variant for the deep thinkers</b>
        </h3>
        <h2>
          <b>Rule</b>
        </h2>
        <br />
        <div>
          <p>
            In <b>normal</b> chess,{" "}
            <i>
              <b>you</b>
            </i>{" "}
            choose a piece and move it.
          </p>
          <p>But... what if you could choose the pieces your rival moves?</p>
          <p>
            In <b>ForceMate</b>,{" "}
            <i>
              <b>your rival</b>
            </i>{" "}
            chooses a piece for you to move, and vice versa.
          </p>
          <br />
          <p>If all your pieces check after your rival's turn, you win.</p>
          <p>
            It's because the rival king is doomed no matter what piece your
            rival chooses.
          </p>
          <p>
            If either player has no legal moves left, the game ends in a
            stalemate.
          </p>
          <br />
          <p>Have fun!</p>
        </div>
      </Modal>
      <Modal
        visible={showModal === "patch"}
        setInvisible={() => setShowModal(null)}
      >
        <h3>
          <b>ForceMate, a chess variant for the deep thinkers</b>
        </h3>
        <h2>
          <b>Patch Note</b>
        </h2>
        <br />
        <div>
          <p>2024-08-13 - v1.0.0</p>
          <p>First version with basic rule</p>
        </div>
      </Modal>
      <Modal
        visible={showModal === "contact"}
        setInvisible={() => setShowModal(null)}
      >
        <h3>
          <b>ForceMate, a chess variant for the deep thinkers</b>
        </h3>
        <h2>
          <b>Contact</b>
        </h2>
        <br />
        <div>
          <p>Welcome all bug reports and idea sharing</p>
          Contact me through <code>jeukhwang.dev(at)gmail(dot)com</code> or{" "}
          <a
            className="github-issue"
            href="https://github.com/JeukHwang/forcemate/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            GitHub Issue
          </a>
        </div>
      </Modal>
    </div>
  );
}
