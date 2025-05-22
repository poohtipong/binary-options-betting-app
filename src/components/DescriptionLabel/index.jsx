import React, { useState } from "react";
import "./style.css";
import { FaQuestionCircle } from "react-icons/fa";

const DescriptionLabel = ({ title, titleText, descriptionText }) => {
  const [onDescription, setOnDescription] = useState(false);
  return (
    <div className="description_label">
      <div className="description_label_title">{title}</div>
      <div className="description_label_question">
        <FaQuestionCircle
          onMouseOver={() => setOnDescription(true)}
          onMouseLeave={() => setOnDescription(false)}
          size={16}
          strokeWidth={1}
        />
        <div
          className={`description_label_question_description ${
            onDescription ? "active" : ""
          }`}
        >
          <div className="description_label_title_text">{titleText}</div>
          <div style={{ color: "#ffffff80" }}>{descriptionText}</div>
        </div>
      </div>
    </div>
  );
};

export default DescriptionLabel;
