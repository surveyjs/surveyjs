import React from "react";
import { Base, Action } from "survey-core";
import { ReactElementFactory } from "../../element-factory";
import { SurveyElementBase } from "../../reactquestion_element";
import { SvgIcon } from "../svg-icon/svg-icon";
import { SurveyActionBarSeparator } from "./action-bar-separator";

interface IActionBarItemProps {
  item: Action;
}

export abstract class SurveyAction extends SurveyElementBase<
  IActionBarItemProps,
  any
> {
  get item() {
    return this.props.item;
  }
  protected getStateElement(): Base {
    return this.item;
  }

  renderElement() {
    const itemClass =
      "sv-action " +
      this.item.css +
      (!this.item.isVisible ? " sv-action--hidden" : "");
    const separator = this.item.needSeparator ? (
      <SurveyActionBarSeparator></SurveyActionBarSeparator>
    ) : null;
    const itemContent = this.renderContent();
    return (
      <span className={itemClass} id={this.item.id}>
        {separator}
        {itemContent}
      </span>
    );
  }
  protected abstract renderContent(): JSX.Element;
}

export class SurveyActionBarItem extends SurveyAction {
  renderContent() {
    return <>{this.renderInnerButton()}</>;
  }
  renderText() {
    if (this.item.hasTitle) {
      var titleClass =
        "sv-action-bar-item__title " +
        (!!this.item.iconName ? "sv-action-bar-item__title--with-icon" : "");
      return <span className={titleClass}> {this.item.title}</span>;
    } else return null;
  }
  renderButtonContent() {
    const text = this.renderText();
    const svgIcon = !!this.item.iconName ? (
      <SvgIcon
        className="sv-action-bar-item__icon"
        size={24}
        iconName={this.item.iconName}
      ></SvgIcon>
    ) : null;
    return (
      <>
        {svgIcon}
        {text}
      </>
    );
  }
  renderInnerButton() {
    const className =
      "sv-action-bar-item " +
      this.item.innerCss +
      (this.item.active ? " sv-action-bar-item--active" : "");
    const title = this.item.tooltip || this.item.title;
    const buttonContent = this.renderButtonContent();
    const button = (
      <button
        className={className}
        disabled={this.item.disabled}
        onClick={() => this.item.action(this.item)}
        title={title}
      >
        {buttonContent}
      </button>
    );
    return button;
  }
}

ReactElementFactory.Instance.registerElement("sv-action-bar-item", (props) => {
  return React.createElement(SurveyActionBarItem, props);
});
