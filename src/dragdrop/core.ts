import {
  MatrixRowModel,
  QuestionMatrixDropdownRenderedRow,
  QuestionMatrixModel,
} from "survey-core";
import { Base, EventBase } from "../base";
import { IElement, ISurvey } from "../base-interfaces";
import { ItemValue } from "../itemvalue";
import { JsonObject, property, Serializer } from "../jsonobject";
import { PageModel } from "../page";
import { QuestionSelectBase } from "../question_baseselect";
import { SurveyModel } from "../survey";

export abstract class DragDropCore extends Base {
  public onBeforeDrop: EventBase<DragDropCore> = new EventBase();
  public onAfterDrop: EventBase<DragDropCore> = new EventBase();

  public static edgeHeight: number = 30;
  public static nestedPanelDepth: number = -1;
  public static prevEvent: any = {
    element: null,
    x: -1,
    y: -1,
  };
  public static newGhostPage: PageModel = null;
  public static ghostSurveyElementName =
    "svc-drag-drop-ghost-survey-element-name"; // before renaming use globa search (we have also css selectors)

  protected draggedElement: any = null;
  @property() dropTargetSurveyElement: IElement = null;

  private draggedElementShortcut: HTMLElement = null;
  private scrollIntervalId: ReturnType<typeof setTimeout> = null;
  private ghostSurveyElement: IElement = null;
  @property() isBottom: boolean = null;
  protected isEdge: boolean = null;

  protected isItemValueBeingDragged() {
    return Serializer.isDescendantOf(
      this.draggedElement.getType(),
      "itemvalue"
    );
  }

  protected get dropTargetDataAttributeName() {
    return `[data-svc-drop-target-${this.draggedElementType}]`;
  }

  protected getDropTargetName(element: HTMLElement) {
    let datasetName = "svcDropTarget";
    const words = this.draggedElementType.split("-");
    words.forEach((word) => {
      datasetName += this.capitalizeFirstLetter(word);
    });
    return element.dataset.svcDropTargetMatrixRow;
  }

  public parentElement: any;
  protected abstract get draggedElementType(): string;

  constructor(private surveyValue?: ISurvey, private creator?: any) {
    super();
  }

  private capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  public get survey() {
    return this.surveyValue || this.creator.survey;
  }

  public startDragToolboxItem(
    event: PointerEvent,
    draggedElementJson: JsonObject
  ) {
    const draggedElement = this.createElementFromJson(draggedElementJson);
    this.startDrag(event, draggedElement);
  }

  public startDrag(
    event: PointerEvent,
    draggedElement: any,
    parentElement?: any
  ) {
    this.draggedElement = draggedElement;
    this.parentElement = parentElement;

    this.ghostSurveyElement = this.createGhostSurveyElement();
    this.draggedElementShortcut = this.createDraggedElementShortcut();

    document.body.append(this.draggedElementShortcut);
    this.moveShortcutElement(event);

    document.addEventListener("pointermove", this.moveDraggedElement);
    document.addEventListener("keydown", this.handleEscapeButton);
    this.draggedElementShortcut.addEventListener("pointerup", this.drop);
  }

  public getItemValueGhostPosition(item: any) {
    if (this.dropTargetSurveyElement !== item) return null;
    if (this.isBottom) return "bottom";
    return "top";
  }

  private createGhostSurveyElement(): any {
    const startWithNewLine = this.draggedElement.startWithNewLine;
    let className = "svc-drag-drop-ghost";

    const json = {
      type: "html",
      name: DragDropCore.ghostSurveyElementName,
      html: `<div class="${className}"></div>`,
    };

    const element = this.createElementFromJson(json);
    element.startWithNewLine = startWithNewLine;

    return element;
  }

  private createDraggedElementShortcut() {
    const draggedElementShortcut = document.createElement("div");
    const draggedElement: any = this.draggedElement;
    draggedElementShortcut.innerText =
      draggedElement["title"] ||
      draggedElement["text"] ||
      draggedElement["name"];
    draggedElementShortcut.className = "svc-drag-shortcut";
    return draggedElementShortcut;
  }

  protected moveDraggedElement = (event: PointerEvent) => {
    this.moveShortcutElement(event);
    this.draggedElementShortcut.style.cursor = "grabbing";
    this.dragOver(event);
  };

  protected dragOver(event: PointerEvent) {
    const dragInfo = this.getDragInfo(event);

    if (this.isItemValueBeingDragged()) {
      this.handleItemValueDragOver(event, dragInfo);
    } else {
      this.handleSurveyElementDragOver(event, dragInfo);
    }
  }

  private handleItemValueDragOver(event: PointerEvent, dragInfo: any) {
    let dropTargetSurveyElement = dragInfo.dropTargetSurveyElement;
    let isEdge = dragInfo.isEdge;
    let isBottom = dragInfo.isBottom;

    const choices = this.parentElement.choices;

    // shouldn't allow to drop on "adorners" (selectall, none, other)
    if (choices.indexOf(dropTargetSurveyElement) === -1) {
      this.banDropHere();
      return;
    }

    //drag over next item
    if (
      choices.indexOf(dropTargetSurveyElement) -
        choices.indexOf(this.draggedElement) ===
      1
    ) {
      isBottom = true;
    }

    //drag over prev item
    if (
      choices.indexOf(this.draggedElement) -
        choices.indexOf(dropTargetSurveyElement) ===
      1
    ) {
      isBottom = false;
    }

    if (dropTargetSurveyElement === this.draggedElement) {
      this.banDropHere();
      return true;
    }

    if (
      dropTargetSurveyElement === this.dropTargetSurveyElement &&
      isEdge === this.isEdge &&
      isBottom === this.isBottom
    )
      return;

    this.dropTargetSurveyElement = dropTargetSurveyElement;
    this.isEdge = isEdge;
    this.isBottom = isBottom;
  }

  private handleSurveyElementDragOver(event: PointerEvent, dragInfo: any) {
    let dropTargetSurveyElement = dragInfo.dropTargetSurveyElement;
    let isEdge = dragInfo.isEdge;
    let isBottom = dragInfo.isBottom;

    if (!dropTargetSurveyElement) {
      this.banDropSurveyElement();
      return;
    }

    if (dropTargetSurveyElement === this.ghostSurveyElement) {
      return;
    }

    if (
      dropTargetSurveyElement === this.dropTargetSurveyElement &&
      isEdge === this.isEdge &&
      isBottom === this.isBottom
    )
      return;

    this.isEdge = isEdge;
    this.isBottom = isBottom;
    this.dropTargetSurveyElement = dropTargetSurveyElement;
    this.insertGhostElementIntoSurvey();
  }

  private handleEscapeButton = (event: KeyboardEvent) => {
    if (event.keyCode == 27) {
      this.clear();
    }
  };

  protected moveShortcutElement(event: PointerEvent) {
    this.doScroll(event.clientY, event.clientX);

    const shortcutHeight = this.draggedElementShortcut.offsetHeight;
    const shortcutWidth = this.draggedElementShortcut.offsetWidth;
    const shortcutXCenter = shortcutWidth / 2;
    const shortcutYCenter = shortcutHeight / 2;

    const documentClientHeight = document.documentElement.clientHeight;
    const documentClientWidth = document.documentElement.clientWidth;

    if (event.clientX + shortcutXCenter >= documentClientWidth) {
      this.draggedElementShortcut.style.left =
        event.pageX -
        event.clientX +
        documentClientWidth -
        shortcutWidth +
        "px";
      this.draggedElementShortcut.style.top =
        event.pageY - shortcutYCenter + "px";
      return;
    }

    if (event.clientX - shortcutXCenter <= 0) {
      this.draggedElementShortcut.style.left =
        event.pageX - event.clientX + "px";
      this.draggedElementShortcut.style.top =
        event.pageY - shortcutYCenter + "px";
      return;
    }

    if (event.clientY + shortcutYCenter >= documentClientHeight) {
      this.draggedElementShortcut.style.left =
        event.pageX - shortcutXCenter + "px";
      this.draggedElementShortcut.style.top =
        event.pageY -
        event.clientY +
        documentClientHeight -
        shortcutHeight +
        "px";
      return;
    }

    if (event.clientY - shortcutYCenter <= 0) {
      this.draggedElementShortcut.style.left =
        event.pageX - shortcutXCenter + "px";
      this.draggedElementShortcut.style.top =
        event.pageY - event.clientY + "px";
      return;
    }

    this.draggedElementShortcut.style.left =
      event.pageX - shortcutXCenter + "px";
    this.draggedElementShortcut.style.top =
      event.pageY - shortcutYCenter + "px";
  }

  private doScroll(clientY: number, clientX: number) {
    clearInterval(this.scrollIntervalId);
    const startScrollBoundary = 50;

    // need to import getScrollableParent method
    // let scrollableParentElement = getScrollableParent(dropZoneElement)
    //   .parentNode;
    let scrollableParentElement =
      document.querySelector(".svc-tab-designer.sd-root-modern") ||
      document.querySelector(".sv_container");

    let top = scrollableParentElement.getBoundingClientRect().top;
    let bottom = scrollableParentElement.getBoundingClientRect().bottom;
    let left = scrollableParentElement.getBoundingClientRect().left;
    let right = scrollableParentElement.getBoundingClientRect().right;

    if (clientY - top <= startScrollBoundary) {
      this.scrollIntervalId = setInterval(() => {
        scrollableParentElement.scrollTop -= 5;
      }, 10);
    } else if (bottom - clientY <= startScrollBoundary) {
      this.scrollIntervalId = setInterval(() => {
        scrollableParentElement.scrollTop += 5;
      }, 10);
    } else if (right - clientX <= startScrollBoundary) {
      this.scrollIntervalId = setInterval(() => {
        scrollableParentElement.scrollLeft += 5;
      }, 10);
    } else if (clientX - left <= startScrollBoundary) {
      this.scrollIntervalId = setInterval(() => {
        scrollableParentElement.scrollLeft -= 5;
      }, 10);
    }
  }

  protected getDragInfo(event: PointerEvent) {
    let dropTargetHTMLElement = this.findDropTargetHTMLElementFromPoint(
      event.clientX,
      event.clientY
    );

    if (!dropTargetHTMLElement) {
      return { dropTargetSurveyElement: null, isEdge: true, isBottom: true };
    }

    let dropTargetSurveyElement = this.getDropTargetSurveyElementFromHTMLElement(
      dropTargetHTMLElement
    );

    let isEdge = true;

    if (!this.isItemValueBeingDragged()) {
      if (dropTargetSurveyElement.isPanel) {
        const panelDragInfo = this.getPanelDragInfo(
          dropTargetHTMLElement,
          dropTargetSurveyElement,
          event
        );
        dropTargetSurveyElement = panelDragInfo.dropTargetSurveyElement;
        isEdge = panelDragInfo.isEdge;
      }
    }

    if (dropTargetSurveyElement === this.draggedElement) {
      dropTargetSurveyElement = null;
    }

    let isBottom = this.calculateIsBottom(dropTargetHTMLElement, event.clientY);

    if (
      // TODO we can't drop on not empty page directly for now
      dropTargetSurveyElement &&
      dropTargetSurveyElement.getType() === "page" &&
      dropTargetSurveyElement.elements.length !== 0
    ) {
      const elements = dropTargetSurveyElement.elements;
      dropTargetSurveyElement = isBottom
        ? elements[elements.length - 1]
        : elements[0];
    }

    return { dropTargetSurveyElement, isEdge, isBottom };
  }

  private getPanelDragInfo(
    HTMLElement: HTMLElement,
    surveyElement: IElement,
    event: PointerEvent
  ) {
    let isEdge = this.calculateIsEdge(HTMLElement, event.clientY);
    let dropTargetSurveyElement = surveyElement;

    if (!isEdge) {
      HTMLElement = this.findDeepestDropTargetChild(HTMLElement);

      dropTargetSurveyElement = this.getDropTargetSurveyElementFromHTMLElement(
        HTMLElement
      );
    }

    return { dropTargetSurveyElement, isEdge };
  }

  protected banDropHere = () => {
    this.dropTargetSurveyElement = null;
    this.isBottom = null;
    this.isEdge = null;
    this.draggedElementShortcut.style.cursor = "not-allowed";
  };

  private banDropSurveyElement = () => {
    this.removeGhostElementFromSurvey();
    this.banDropHere();
  };

  private getDropTargetSurveyElementFromHTMLElement(element: HTMLElement) {
    let result = undefined;
    let dragOverElementName = this.getDropTargetName(element);
    let isDragOverInnerPanel = false;
    if (!dragOverElementName) {
      const nearestDropTargetElement = element.parentElement.closest<
        HTMLElement
      >(this.dropTargetDataAttributeName);
      dragOverElementName = this.getDropTargetName(nearestDropTargetElement);
      isDragOverInnerPanel =
        nearestDropTargetElement !== element && !!dragOverElementName;
    }
    if (!dragOverElementName) {
      throw new Error("Can't find drop target survey element name");
    }

    if (dragOverElementName === DragDropCore.ghostSurveyElementName) {
      return this.ghostSurveyElement;
    }

    result = this.getDragOverElementByName(
      dragOverElementName,
      isDragOverInnerPanel
    );

    return result;
  }

  protected abstract getDragOverElementByName(
    dropTargetName: any,
    isDragOverInnerPanel?: boolean
  ): any;

  private calculateMiddleOfHTMLElement(HTMLElement: HTMLElement) {
    const rect = HTMLElement.getBoundingClientRect();
    return rect.y + rect.height / 2;
  }

  private calculateIsBottom(HTMLElement: HTMLElement, clientY: number) {
    const middle = this.calculateMiddleOfHTMLElement(HTMLElement);
    return clientY >= middle;
  }

  private calculateIsEdge(HTMLElement: HTMLElement, clientY: number) {
    const middle = this.calculateMiddleOfHTMLElement(HTMLElement);
    return Math.abs(clientY - middle) >= DragDropCore.edgeHeight;
  }

  private findDropTargetHTMLElement(draggedOverNode: Element): HTMLElement {
    if (!draggedOverNode) return null;

    const selector = this.dropTargetDataAttributeName;
    let dropTargetHTMLElement =
      draggedOverNode.querySelector<HTMLElement>(selector) ||
      draggedOverNode.closest<HTMLElement>(selector);

    return dropTargetHTMLElement;
  }

  private findDropTargetHTMLElementFromPoint(
    clientX: number,
    clientY: number
  ): HTMLElement {
    this.draggedElementShortcut.hidden = true;
    let draggedOverNode = document.elementFromPoint(clientX, clientY);
    this.draggedElementShortcut.hidden = false;

    return this.findDropTargetHTMLElement(draggedOverNode);
  }

  private findDeepestDropTargetChild(parent: HTMLElement): HTMLElement {
    const selector = this.dropTargetDataAttributeName;

    let result = parent;
    while (!!parent) {
      result = parent;
      parent = parent.querySelector(selector);
    }

    return <HTMLElement>result;
  }

  private insertGhostElementIntoSurvey(): boolean {
    this.removeGhostElementFromSurvey();

    this.ghostSurveyElement.name = DragDropCore.ghostSurveyElementName; //TODO why do we need setup it manually see createGhostSurveyElement method

    this.parentElement = this.dropTargetSurveyElement.isPage
      ? this.dropTargetSurveyElement
      : (<any>this.dropTargetSurveyElement)["page"];

    this.parentElement.dragDropStart(
      this.draggedElement,
      this.ghostSurveyElement,
      DragDropCore.nestedPanelDepth
    );

    return this.parentElement.dragDropMoveTo(
      this.dropTargetSurveyElement,
      this.isBottom,
      this.isEdge
    );
  }

  private insertRealElementIntoSurvey() {
    this.removeGhostElementFromSurvey();

    // ghost new page
    if (
      this.dropTargetSurveyElement.isPage &&
      (<any>this.dropTargetSurveyElement)["_isGhost"]
    ) {
      (<any>this.dropTargetSurveyElement)["_addGhostPageViewMobel"]();
    }
    // EO ghost new page

    // fake target element (need only for "startWithNewLine:false" feature)
    //TODO need for dragDrop helper in library
    const json = new JsonObject().toJsonObject(this.draggedElement);
    json["type"] = this.draggedElement.getType();
    const fakeTargetElement = this.createFakeTargetElement(
      this.draggedElement.name,
      json
    );
    // EO fake target element

    this.parentElement.dragDropStart(
      this.draggedElement,
      fakeTargetElement,
      DragDropCore.nestedPanelDepth
    );

    this.parentElement.dragDropMoveTo(
      this.dropTargetSurveyElement,
      this.isBottom,
      this.isEdge
    );

    this.onBeforeDrop.fire(this, null);
    const newElement = this.parentElement.dragDropFinish();
    this.onAfterDrop.fire(this, { draggedElement: newElement });
  }

  private removeGhostElementFromSurvey() {
    if (!!this.parentElement) this.parentElement.dragDropFinish(true);
  }

  private createElementFromJson(json: object) {
    const element: any = this.createNewElement(json);
    if (element["setSurveyImpl"]) {
      element["setSurveyImpl"](this.survey);
    } else {
      element["setData"](this.survey);
    }
    element.renderWidth = "100%";
    return element;
  }

  private createNewElement(json: any): IElement {
    var newElement = Serializer.createClass(json["type"]);
    new JsonObject().toObject(json, newElement);
    return newElement;
  }

  private createFakeTargetElement(elementName: string, json: any): any {
    if (!elementName || !json) return null;
    var targetElement = null;
    targetElement = Serializer.createClass(json["type"]);
    new JsonObject().toObject(json, targetElement);
    targetElement.name = elementName;
    if (targetElement["setSurveyImpl"]) {
      targetElement["setSurveyImpl"](this.survey);
    } else {
      targetElement["setData"](this.survey);
    }
    targetElement.renderWidth = "100%";
    return targetElement;
  }

  private drop = () => {
    if (this.isItemValueBeingDragged()) {
      this.doDropItemValue();
    } else {
      this.doDropSurveyElement();
    }
    this.clear();
  };

  private doDropSurveyElement() {
    if (this.dropTargetSurveyElement) {
      this.insertRealElementIntoSurvey();
    }
  }

  private doDropItemValue = () => {
    const isTop = !this.isBottom;
    const choices = this.parentElement.choices;
    const oldIndex = choices.indexOf(this.draggedElement);
    let newIndex = choices.indexOf(this.dropTargetSurveyElement);

    if (oldIndex < newIndex && isTop) {
      newIndex--;
    } else if (oldIndex > newIndex && this.isBottom) {
      newIndex++;
    }

    this.onBeforeDrop.fire(this, null);
    choices.splice(oldIndex, 1);
    choices.splice(newIndex, 0, this.draggedElement);
    this.onAfterDrop.fire(this, {
      draggedElement: this.parentElement,
    });
  };

  private clear = () => {
    clearInterval(this.scrollIntervalId);

    document.removeEventListener("pointermove", this.moveDraggedElement);
    document.removeEventListener("keydown", this.handleEscapeButton);
    this.draggedElementShortcut.removeEventListener("pointerup", this.drop);
    document.body.removeChild(this.draggedElementShortcut);

    this.removeGhostElementFromSurvey();

    const prevEvent = DragDropCore.prevEvent;
    prevEvent.element = null;
    prevEvent.x = -1;
    prevEvent.y = -1;

    this.dropTargetSurveyElement = null;
    this.draggedElementShortcut = null;
    this.ghostSurveyElement = null;
    this.draggedElement = null;
    this.parentElement = null;
    this.parentElement = null;
    this.isBottom = null;
    this.isEdge = null;
    this.scrollIntervalId = null;
  };
}
