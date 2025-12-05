"use client";

import { useEffect, useState, forwardRef } from "react";

export default function TitleEdit({ title, editModeOn }) {
  const [titleEditOn, setTitleEditOn] = useState(false);
  const [tempTitleText, setTempTitleText] = useState(title);

  useEffect(() => {
    setTempTitleText(title);
  }, [title]);

  return (
    <>
      <div className="w-full sm:w-[500px] p-2 bg-blue-500">
        <input
          type="text"
          className="focus:outline-none"
          value={tempTitleText}
          onChange={(e) => setTempTitleText(e.target.value)}
        ></input>
        <p>Here</p>
      </div>
    </>
  );
}
