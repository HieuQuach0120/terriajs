import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import Icon from "../../../../Styled/Icon";
import Text from "../../../../Styled/Text";
import Prompt from "../../../Generic/Prompt";
import { useViewState } from "../../../Context";

import Styles from "./workbench.scss";
import {
  Category,
  ViewAction
} from "../../../../Core/AnalyticEvents/analyticEvents";

const Workbench = observer(() => {
  const { t } = useTranslation();
  const viewState = useViewState();

  const toggleFullScreen = () => {
    viewState.setIsMapFullScreen(!viewState.isMapFullScreen);

    // log a GA event
    viewState.terria.analytics?.logEvent(
      Category.view,
      viewState.isMapFullScreen
        ? ViewAction.exitFullScreen
        : ViewAction.enterFullScreen
    );
  };
  return (
    <div>
      <button
        className={Styles.workbenchBtn}
        onClick={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          toggleFullScreen();
        }}
      >
        <Icon glyph={Icon.GLYPHS.calendar} />
        <span>{t("splitterTool.workbench.btnText")}</span>
      </button>
    </div>
  );
});

export default Workbench;
