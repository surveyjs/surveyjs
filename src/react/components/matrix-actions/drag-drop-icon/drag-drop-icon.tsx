import React from "react";
import { QuestionMatrixDropdownModelBase } from "survey-core";
import { ReactElementFactory } from "../../../element-factory";
import { ReactSurveyElement } from "../../../reactquestion_element";
import { SurveyAction } from "../../action-bar/action-bar-item";

export class SurveyQuestionMatrixDynamicDragDropIcon extends SurveyAction {
  private get question(): QuestionMatrixDropdownModelBase {
    return this.item.data.question;
  }
  protected renderContent(): JSX.Element {
    return <span className={this.question.cssClasses.iconDrag} />;
  }
}

ReactElementFactory.Instance.registerElement(
  "sv-matrix-drag-drop-icon",
  (props) => {
    return React.createElement(SurveyQuestionMatrixDynamicDragDropIcon, props);
  }
);
