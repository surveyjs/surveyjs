import React from "react";
import {
  MatrixDropdownRowModelBase,
  QuestionMatrixDropdownModelBase,
} from "survey-core";
import { ReactElementFactory } from "../../../element-factory";
import { SurveyAction } from "../../action-bar/action-bar-item";

export class SurveyQuestionMatrixDynamicRemoveButton extends SurveyAction {
  constructor(props: any) {
    super(props);
    this.handleOnRowRemoveClick = this.handleOnRowRemoveClick.bind(this);
  }
  private get question(): QuestionMatrixDropdownModelBase {
    return this.item.data.question;
  }
  private get row(): MatrixDropdownRowModelBase {
    return this.item.data.row;
  }
  handleOnRowRemoveClick(event: any) {
    this.question.removeRowUI(this.row);
  }
  protected renderContent(): JSX.Element {
    var removeRowText = this.renderLocString(this.question.locRemoveRowText);
    return (
      <button
        className={
          this.question.cssClasses.button +
          " " +
          this.question.cssClasses.buttonRemove
        }
        type="button"
        onClick={this.handleOnRowRemoveClick}
        disabled={this.question.isInputReadOnly}
      >
        {removeRowText}
        <span className={this.question.cssClasses.iconRemove} />
      </button>
    );
  }
}

ReactElementFactory.Instance.registerElement(
  "sv-matrix-remove-button",
  (props) => {
    return React.createElement(SurveyQuestionMatrixDynamicRemoveButton, props);
  }
);
