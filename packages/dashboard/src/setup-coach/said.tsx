import { Fragment } from "react";

// What the coach said, with its **bold** words bold and its lines kept.
export function Said({ text }: Readonly<{ text: string }>) {
  const pieces = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span className="whitespace-pre-line">
      {pieces.map((piece, index) =>
        index % 2 === 1 ? (
          <strong key={index} className="font-medium">
            {piece}
          </strong>
        ) : (
          <Fragment key={index}>{piece}</Fragment>
        ),
      )}
    </span>
  );
}
