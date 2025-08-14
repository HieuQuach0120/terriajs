declare namespace WorkbenchScssNamespace {
  export interface IWorkbenchScss {
    workbenchBtn: string;
  }
}

declare const WorkbenchScssModule: WorkbenchScssNamespace.IWorkbenchScss & {
  /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
  locals: WorkbenchScssNamespace.IWorkbenchScss;
};

export = WorkbenchScssModule;
