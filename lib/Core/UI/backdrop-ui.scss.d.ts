declare namespace BackdropUiScssNamespace {
  export interface IBackdropUiScss {
    active: string;
    "backdrop-container": string;
    backdropContainer: string;
    "center-button": string;
    "center-circle": string;
    centerButton: string;
    centerCircle: string;
    "fade-in": string;
    "fade-out": string;
    fadeIn: string;
    fadeOut: string;
    "menu-active": string;
    "menu-closing": string;
    "menu-item": string;
    "menu-items": string;
    menuActive: string;
    menuClosing: string;
    menuItem: string;
    menuItems: string;
    ripple: string;
    "ripple-effect": string;
    rippleEffect: string;
    "rotate-menu": string;
    rotateMenu: string;
  }
}

declare const BackdropUiScssModule: BackdropUiScssNamespace.IBackdropUiScss & {
  /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
  locals: BackdropUiScssNamespace.IBackdropUiScss;
};

export = BackdropUiScssModule;
