import { create } from "react-test-renderer";
import { act } from "react-dom/test-utils";

import Terria from "../../../../../lib/Models/Terria";

import LangPanel from "../../../../../lib/ReactViews/Map/Panels/LangPanel/LangPanel";

describe("LangPanel", function () {
  let terria: Terria;

  let testRenderer: any;

  beforeEach(function () {
    terria = new Terria({
      baseUrl: "./"
    });
  });

  it("should not render if there is no langauge config", function () {
    act(() => {
      testRenderer = create(<LangPanel terria={terria} smallScreen={false} />);
    });

    expect(testRenderer.toJSON()).toBeNull();
  });

  it("should render if language are provided in config", function () {
    terria.updateParameters({
      languageConfiguration: {
        enabled: true,
        debug: false,
        languages: {
          en: "English",
          fr: "Français",
          vi: "Tiếng Việt"
        },
        fallbackLanguage: "vi"
      }
    });
    act(() => {
      testRenderer = create(<LangPanel terria={terria} smallScreen={false} />);
    });

    expect(testRenderer.toJSON()).toBeDefined();
  });
});
