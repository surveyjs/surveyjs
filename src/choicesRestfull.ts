import { Base, SurveyError, ITextProcessor, IQuestion, ISurvey } from "./base";
import { ItemValue } from "./itemvalue";
import { Serializer, JsonObjectProperty } from "./jsonobject";
import { WebRequestError, WebRequestEmptyError } from "./error";
import { settings } from "./settings";

class XmlParser {
  private parser = new DOMParser();
  public assignValue(target: any, name: string, value: any) {
    if (Array.isArray(target[name])) {
      target[name].push(value);
    } else if (target[name] !== undefined) {
      target[name] = [target[name]].concat(value);
    } else if (
      typeof value === "object" &&
      Object.keys(value).length === 1 &&
      Object.keys(value)[0] === name
    ) {
      target[name] = value[name];
    } else {
      target[name] = value;
    }
  }
  public xml2Json(xmlNode: any, result: any) {
    if (xmlNode.children && xmlNode.children.length > 0) {
      for (let i = 0; i < xmlNode.children.length; i++) {
        let childNode = xmlNode.children[i];
        let childObject = {};
        this.xml2Json(childNode, childObject);
        this.assignValue(result, childNode.nodeName, childObject);
      }
    } else {
      this.assignValue(result, xmlNode.nodeName, xmlNode.textContent);
    }
  }
  public parseXmlString(xmlString: string) {
    let xmlRoot = this.parser.parseFromString(xmlString, "text/xml");
    let json = {};
    this.xml2Json(xmlRoot, json);
    return json;
  }
}

/**
 * A definition for filling choices for checkbox, dropdown and radiogroup questions from resfull services.
 * The run method call a restfull service and results can be get on getResultCallback.
 */
export class ChoicesRestfull extends Base {
  private static cacheText = "{CACHE}";
  private static noCacheText = "{NOCACHE}";
  public static get EncodeParameters(): boolean {
    return settings.webserviceEncodeParameters;
  }
  public static set EncodeParameters(val: boolean) {
    settings.webserviceEncodeParameters = val;
  }
  public static clearCache() {
    ChoicesRestfull.itemsResult = {};
    ChoicesRestfull.sendingSameRequests = {};
  }
  private static itemsResult: { [index: string]: any } = {};
  private static sendingSameRequests: {
    [index: string]: Array<ChoicesRestfull>;
  } = {};
  private static addSameRequest(obj: ChoicesRestfull): boolean {
    if (!obj.isUsingCache) return false;
    var hash = obj.objHash;
    var res = ChoicesRestfull.sendingSameRequests[hash];
    if (!res) {
      ChoicesRestfull.sendingSameRequests[obj.objHash] = [];
      return false;
    }
    res.push(obj);
    return true;
  }
  private static unregisterSameRequests(obj: ChoicesRestfull, items: any) {
    if (!obj.isUsingCache) return;
    var res = ChoicesRestfull.sendingSameRequests[obj.objHash];
    delete ChoicesRestfull.sendingSameRequests[obj.objHash];
    if (!res) return;
    for (var i = 0; i < res.length; i++) {
      if (!!res[i].getResultCallback) {
        res[i].getResultCallback(items);
      }
    }
  }
  public static onBeforeSendRequest: (
    sender: ChoicesRestfull,
    options: { request: XMLHttpRequest }
  ) => void;
  private static getCachedItemsResult(obj: ChoicesRestfull): boolean {
    var hash = obj.objHash;
    var res = ChoicesRestfull.itemsResult[hash];
    if (!res) return false;
    if (obj.getResultCallback) {
      obj.getResultCallback(res);
    }
    return true;
  }
  private lastObjHash: string = "";
  private isRunningValue: boolean = false;
  protected processedUrl: string = "";
  protected processedPath: string = "";
  private isUsingCacheFromUrl: boolean = undefined;
  public onProcessedUrlCallback: (url: string, path: string) => void;
  public getResultCallback: (items: Array<ItemValue>) => void;
  public beforeSendRequestCallback: () => void;
  public updateResultCallback: (
    items: Array<ItemValue>,
    serverResult: any
  ) => Array<ItemValue>;
  public getItemValueCallback: (item: any) => any;
  public error: SurveyError = null;
  public owner: IQuestion;
  constructor() {
    super();
  }
  public getSurvey(): ISurvey {
    return !!this.owner ? this.owner.survey : null;
  }
  public run(textProcessor: ITextProcessor = null) {
    if (!this.url || !this.getResultCallback) return;
    this.processedText(textProcessor);
    if (!this.processedUrl) {
      this.doEmptyResultCallback({});
      this.lastObjHash = this.objHash;
      return;
    }
    if (this.lastObjHash === this.objHash) return;
    this.lastObjHash = this.objHash;
    this.error = null;
    if (this.useChangedItemsResults()) return;
    if (ChoicesRestfull.addSameRequest(this)) return;
    this.sendRequest();
  }
  public get isUsingCache(): boolean {
    if (this.isUsingCacheFromUrl === true) return true;
    if (this.isUsingCacheFromUrl === false) return false;
    return settings.useCachingForChoicesRestfull;
  }
  public get isRunning() {
    return this.isRunningValue;
  }
  public get isWaitingForParameters() {
    return this.url && !this.processedUrl;
  }
  protected useChangedItemsResults(): boolean {
    return ChoicesRestfull.getCachedItemsResult(this);
  }
  private doEmptyResultCallback(serverResult: any) {
    var items: Array<any> = [];
    if (this.updateResultCallback) {
      items = this.updateResultCallback(items, serverResult);
    }
    this.getResultCallback(items);
  }
  private processedText(textProcessor: ITextProcessor) {
    var urlText = this.url;
    if (!!urlText) {
      urlText = urlText
        .replace(ChoicesRestfull.cacheText, "")
        .replace(ChoicesRestfull.noCacheText, "");
    }
    if (textProcessor) {
      var pUrl = textProcessor.processTextEx(
        urlText,
        false,
        settings.webserviceEncodeParameters
      );
      var pPath = textProcessor.processTextEx(
        this.path,
        false,
        settings.webserviceEncodeParameters
      );
      if (!pUrl.hasAllValuesOnLastRun || !pPath.hasAllValuesOnLastRun) {
        this.processedUrl = "";
        this.processedPath = "";
      } else {
        this.processedUrl = pUrl.text;
        this.processedPath = pPath.text;
      }
    } else {
      this.processedUrl = urlText;
      this.processedPath = this.path;
    }
    if (this.onProcessedUrlCallback) {
      this.onProcessedUrlCallback(this.processedUrl, this.processedPath);
    }
  }
  protected parseResponse(response: any) {
    let parsedResponse;
    if (
      !!response &&
      typeof response.indexOf === "function" &&
      response.indexOf("<") === 0
    ) {
      var parser = new XmlParser();
      parsedResponse = parser.parseXmlString(response);
    } else {
      try {
        parsedResponse = JSON.parse(response);
      } catch {
        parsedResponse = (response || "")
          .split("\n")
          .map((s: any) => s.trim(" "))
          .filter((s: any) => !!s);
      }
    }
    return parsedResponse;
  }
  protected sendRequest() {
    this.isRunningValue = true;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", this.processedUrl);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    if (this.authorization) {
      xhr.setRequestHeader("Authorization", this.authorization);
    }
    var self = this;
    var loadingObjHash = this.objHash;
    xhr.onload = function () {
      self.isRunningValue = false;
      if (xhr.status === 200) {
        self.onLoad(self.parseResponse(xhr.response), loadingObjHash);
      } else {
        self.onError(xhr.statusText, xhr.responseText);
      }
    };
    var options = { request: xhr };
    if (!!ChoicesRestfull.onBeforeSendRequest) {
      ChoicesRestfull.onBeforeSendRequest(this, options);
    }
    this.beforeSendRequest();
    options.request.send();
  }
  public getType(): string {
    return "choicesByUrl";
  }
  public get isEmpty(): boolean {
    return (
      !this.url &&
      !this.path &&
      !this.valueName &&
      !this.titleName &&
      !this.imageLinkName
    );
  }
  public getCustomPropertiesNames(): Array<string> {
    var properties = this.getCustomProperties();
    var res = new Array<string>();
    for (var i = 0; i < properties.length; i++) {
      res.push(this.getCustomPropertyName(properties[i].name));
    }
    return res;
  }
  private getCustomPropertyName(propertyName: string): string {
    return propertyName + "Name";
  }
  private getCustomProperties(): Array<JsonObjectProperty> {
    var properties = Serializer.getProperties(this.itemValueType);
    var res = [];
    for (var i = 0; i < properties.length; i++) {
      if (
        properties[i].name === "value" ||
        properties[i].name === "text" ||
        properties[i].name === "visibleIf" ||
        properties[i].name === "enableIf"
      )
        continue;
      res.push(properties[i]);
    }
    return res;
  }
  public setData(json: any) {
    this.clear();
    if (json.url) this.url = json.url;
    if (json.authorization) this.authorization = json.authorization;
    if (json.path) this.path = json.path;
    if (json.valueName) this.valueName = json.valueName;
    if (json.titleName) this.titleName = json.titleName;
    if (json.imageLinkName) this.imageLinkName = json.imageLinkName;
    if (json.allowEmptyResponse !== undefined)
      this.allowEmptyResponse = json.allowEmptyResponse;
    if (json.attachOriginalItems !== undefined)
      this.attachOriginalItems = json.attachOriginalItems;
    var properties = this.getCustomPropertiesNames();
    for (var i = 0; i < properties.length; i++) {
      if (json[properties[i]]) (<any>this)[properties[i]] = json[properties[i]];
    }
  }
  public getData(): any {
    if (this.isEmpty) return null;
    var res: any = {};
    if (this.url) res["url"] = this.url;
    if (this.authorization) res["authorization"] = this.authorization;
    if (this.path) res["path"] = this.path;
    if (this.valueName) res["valueName"] = this.valueName;
    if (this.titleName) res["titleName"] = this.titleName;
    if (this.imageLinkName) res["imageLinkName"] = this.imageLinkName;
    if (this.allowEmptyResponse)
      res["allowEmptyResponse"] = this.allowEmptyResponse;
    if (this.attachOriginalItems)
      res["attachOriginalItems"] = this.attachOriginalItems;
    var properties = this.getCustomPropertiesNames();
    for (var i = 0; i < properties.length; i++) {
      if ((<any>this)[properties[i]])
        res[properties[i]] = (<any>this)[properties[i]];
    }
    return res;
  }
  public get url(): string {
    return this.getPropertyValue("url", "");
  }
  public set url(val: string) {
    this.setPropertyValue("url", val);
    this.isUsingCacheFromUrl = undefined;
    if (!val) return;
    if (val.indexOf(ChoicesRestfull.cacheText) > -1) {
      this.isUsingCacheFromUrl = true;
    } else {
      if (val.indexOf(ChoicesRestfull.noCacheText) > -1) {
        this.isUsingCacheFromUrl = false;
      }
    }
  }
  public get authorization(): string {
    return this.getPropertyValue("authorization", "");
  }
  public set authorization(val: string) {
    this.setPropertyValue("authorization", val);
  }
  public get path(): string {
    return this.getPropertyValue("path", "");
  }
  public set path(val: string) {
    this.setPropertyValue("path", val);
  }
  public get valueName(): string {
    return this.getPropertyValue("valueName", "");
  }
  public set valueName(val: string) {
    this.setPropertyValue("valueName", val);
  }
  public get titleName(): string {
    return this.getPropertyValue("titleName", "");
  }
  public set titleName(val: string) {
    this.setPropertyValue("titleName", val);
  }
  public get imageLinkName(): string {
    return this.getPropertyValue("imageLinkName", "");
  }
  public set imageLinkName(val: string) {
    this.setPropertyValue("imageLinkName", val);
  }
  public get allowEmptyResponse(): boolean {
    return this.getPropertyValue("allowEmptyResponse", false);
  }
  public set allowEmptyResponse(val: boolean) {
    this.setPropertyValue("allowEmptyResponse", val);
  }
  public get attachOriginalItems(): boolean {
    return this.getPropertyValue("attachOriginalItems", false);
  }
  public set attachOriginalItems(val: boolean) {
    this.setPropertyValue("attachOriginalItems", val);
  }
  public get itemValueType(): string {
    if (!this.owner) return "itemvalue";
    var prop = Serializer.findProperty(this.owner.getType(), "choices");
    if (!prop) return "itemvalue";
    if (prop.type == "itemvalue[]") return "itemvalue";
    return prop.type;
  }
  public clear() {
    this.url = "";
    this.authorization = "";
    this.path = "";
    this.valueName = "";
    this.titleName = "";
    this.imageLinkName = "";
    var properties = this.getCustomPropertiesNames();
    for (var i = 0; i < properties.length; i++) {
      if ((<any>this)[properties[i]]) (<any>this)[properties[i]] = "";
    }
  }
  protected beforeSendRequest() {
    if (!!this.beforeSendRequestCallback) {
      this.beforeSendRequestCallback();
    }
  }
  protected onLoad(result: any, loadingObjHash: string = null) {
    if (!loadingObjHash) {
      loadingObjHash = this.objHash;
    }
    var items = new Array<ItemValue>();
    var updatedResult = this.getResultAfterPath(result);
    if (updatedResult && updatedResult["length"]) {
      for (var i = 0; i < updatedResult.length; i++) {
        var itemValue = updatedResult[i];
        if (!itemValue) continue;
        var value = !!this.getItemValueCallback
          ? this.getItemValueCallback(itemValue)
          : this.getValue(itemValue);
        var title = this.getTitle(itemValue);
        var item = new ItemValue(value, title);
        this.setCustomProperties(item, itemValue);
        if (this.attachOriginalItems) {
          item.originalItem = itemValue;
        }
        var imageLink = this.getImageLink(itemValue);
        if (!!imageLink) {
          item.imageLink = imageLink;
        }
        items.push(item);
      }
    } else {
      if (!this.allowEmptyResponse) {
        this.error = new WebRequestEmptyError(null, this.owner);
      }
    }
    if (this.updateResultCallback) {
      items = this.updateResultCallback(items, result);
    }
    if (this.isUsingCache) {
      ChoicesRestfull.itemsResult[loadingObjHash] = items;
    }
    this.callResultCallback(items, loadingObjHash);
    ChoicesRestfull.unregisterSameRequests(this, items);
  }
  protected callResultCallback(
    items: Array<ItemValue>,
    loadingObjHash: string
  ) {
    if (loadingObjHash != this.objHash) return;
    this.getResultCallback(items);
  }
  private setCustomProperties(item: ItemValue, itemValue: any) {
    var properties = this.getCustomProperties();
    for (var i = 0; i < properties.length; i++) {
      var prop = properties[i];
      var val = this.getValueCore(
        itemValue,
        this.getPropertyBinding(prop.name)
      );
      if (!this.isValueEmpty(val)) {
        (<any>item)[prop.name] = val;
      }
    }
  }
  private getPropertyBinding(propertyName: string) {
    if ((<any>this)[this.getCustomPropertyName(propertyName)])
      return (<any>this)[this.getCustomPropertyName(propertyName)];
    if ((<any>this)[propertyName]) return (<any>this)[propertyName];
    return propertyName;
  }
  private onError(status: string, response: string) {
    this.error = new WebRequestError(status, response, this.owner);
    this.doEmptyResultCallback(response);
    ChoicesRestfull.unregisterSameRequests(this, []);
  }
  private getResultAfterPath(result: any) {
    if (!result) return result;
    if (!this.processedPath) return result;
    var pathes = this.getPathes();
    for (var i = 0; i < pathes.length; i++) {
      result = result[pathes[i]];
      if (!result) return null;
    }
    return result;
  }
  private getPathes(): Array<string> {
    var pathes = [];
    if (this.processedPath.indexOf(";") > -1) {
      pathes = this.path.split(";");
    } else {
      pathes = this.processedPath.split(",");
    }
    if (pathes.length == 0) pathes.push(this.processedPath);
    return pathes;
  }
  private getValue(item: any): any {
    if (!item) return null;
    if (this.valueName) return this.getValueCore(item, this.valueName);
    if (!(item instanceof Object)) return item;
    var len = Object.keys(item).length;
    if (len < 1) return null;
    return item[Object.keys(item)[0]];
  }
  private getTitle(item: any): any {
    var title = this.titleName ? this.titleName : "title";
    return this.getValueCore(item, title);
  }
  private getImageLink(item: any): any {
    var imageLink = this.imageLinkName ? this.imageLinkName : "imageLink";
    return this.getValueCore(item, imageLink);
  }
  private getValueCore(item: any, property: string): any {
    if (!item) return null;
    if (property.indexOf(".") < 0) return item[property];
    var properties = property.split(".");
    for (var i = 0; i < properties.length; i++) {
      item = item[properties[i]];
      if (!item) return null;
    }
    return item;
  }
  private get objHash() {
    return (
      this.processedUrl +
      ";" +
      this.processedPath +
      ";" +
      this.valueName +
      ";" +
      this.titleName +
      ";" +
      this.imageLinkName
    );
  }
}

Serializer.addClass(
  "choicesByUrl",
  [
    "url",
    "authorization",
    "path",
    "valueName",
    "titleName",
    {
      name: "imageLinkName",
      visibleIf: function (obj: any) {
        return !!obj && !!obj.owner && obj.owner.getType() == "imagepicker";
      },
    },
    { name: "allowEmptyResponse:boolean", default: false },
    { name: "attachOriginalItems:boolean", default: false, visible: false },
  ],
  function () {
    return new ChoicesRestfull();
  }
);
