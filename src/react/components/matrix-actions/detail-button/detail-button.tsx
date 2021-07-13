import React from "react";
import {
  MatrixDropdownRowModelBase,
  QuestionMatrixDropdownModelBase,
} from "survey-core";
import { ReactElementFactory } from "../../../element-factory";
import { SurveyAction } from "../../action-bar/action-bar-item";

export class SurveyQuestionMatrixDetailButton extends SurveyAction {
  constructor(props: any) {
    super(props);
    this.handleOnShowHideClick = this.handleOnShowHideClick.bind(this);
  }
  private get question(): QuestionMatrixDropdownModelBase {
    return this.item.data.question;
  }
  private get row(): MatrixDropdownRowModelBase {
    return this.item.data.row;
  }
  handleOnShowHideClick(event: any) {
    this.row.showHideDetailPanelClick();
  }
  protected renderContent(): JSX.Element {
    var isExpanded = this.row.isDetailPanelShowing;
    var ariaExpanded = isExpanded;
    var ariaControls = isExpanded ? this.row.detailPanelId : null;
    return (
      <button
        type="button"
        onClick={this.handleOnShowHideClick}
        className={this.question.getDetailPanelButtonCss(this.row)}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
      >
        <span className={this.question.getDetailPanelIconCss(this.row)} />
      </button>
    );
  }
}

ReactElementFactory.Instance.registerElement(
  "sv-matrix-detail-button",
  (props) => {
    return React.createElement(SurveyQuestionMatrixDetailButton, props);
  }
);
