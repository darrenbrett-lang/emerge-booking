"use client";

import { forwardRef, useState } from "react";
import { PRICE } from "@/lib/price";

// £10, £15 or £20, £15 chosen to start with, or Other for any whole pound
// from £10 to £200. Used by the booking form and the waiting list offer.
// The form reads the field named "price"; the server checks it again.
export const PricePicker = forwardRef<HTMLInputElement, { idPrefix: string }>(function PricePicker({ idPrefix }, otherRef) {
  const [choice, setChoice] = useState<string>(String(PRICE.defaultPounds));
  const [other, setOther] = useState("");
  const isOther = choice === "other";

  return (
    <fieldset className="price-picker">
      <legend>
        We are working to create a space that nourishes new connections and ideas. Your contributions support the
        building of a much-needed community.
      </legend>
      <div className="price-options">
        {[...PRICE.presets.map(String), "other"].map((v) => (
          <label key={v} className={`price-option${choice === v ? " is-on" : ""}`}>
            <input
              type="radio"
              name="price_choice"
              value={v}
              checked={choice === v}
              onChange={() => setChoice(v)}
            />
            <span>{v === "other" ? "Other" : `£${v}`}</span>
          </label>
        ))}
      </div>
      {isOther && (
        <div className="price-other">
          <label htmlFor={`${idPrefix}-price-other`}>Your amount, £{PRICE.minPounds} to £{PRICE.maxPounds}</label>
          <div className="price-other-field">
            <span aria-hidden="true">£</span>
            <input
              ref={otherRef}
              id={`${idPrefix}-price-other`}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={3}
              value={other}
              onChange={(e) => setOther(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="25"
            />
          </div>
        </div>
      )}
      <input type="hidden" name="price" value={isOther ? other : choice} />
      <p className="price-note">Everyone gets the same night, whatever they pay.</p>
    </fieldset>
  );
});
