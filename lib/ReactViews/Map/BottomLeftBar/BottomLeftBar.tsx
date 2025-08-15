import { observer } from "mobx-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import defined from "terriajs-cesium/Source/Core/defined";
import type Cesium3DTilesCatalogItem from "../../../Models/Catalog/CatalogItems/Cesium3DTilesCatalogItem";
import ViewerMode from "../../../Models/ViewerMode";
import ViewState from "../../../ReactViewModels/ViewState";
import Box from "../../../Styled/Box";
import Icon from "../../../Styled/Icon";
import Text from "../../../Styled/Text";
import { useViewState } from "../../Context";
import parseCustomHtmlToReact from "../../Custom/parseCustomHtmlToReact";
import MapIconButton from "../../MapIconButton/MapIconButton";

// Use padding to avoid other UI elements
const AttributionsContainer = styled(Text)`
  text-shadow: 0 0 2px #000000;
  padding-left: 8px;
  padding-right: 56px;
  @media (max-width: ${(props) => props.theme.mobile}px) {
    padding-right: 8px;
    padding-bottom: 32px;
  }
`;

const shouldShowPlayStoryButton = (viewState: ViewState) =>
  viewState.terria.configParameters.storyEnabled &&
  defined(viewState.terria.stories) &&
  viewState.terria.stories.length > 0 &&
  viewState.useSmallScreenInterface &&
  // Don't show story button if story panel is visible
  viewState.storyShown !== true;

const BottomLeftBar: FC = observer(() => {
  const { t } = useTranslation();
  const viewState = useViewState();

  const screenDataAttributions =
    viewState.terria.cesium?.cesiumScreenDataAttributions;

  const isNotificationActive =
    viewState.terria.notificationState.currentNotification;

  const isUsingGooglePhotorealistic3dTiles =
    viewState.terria.mainViewer.viewerMode === ViewerMode.Cesium &&
    viewState.terria.workbench.items
      .filter((i): i is Cesium3DTilesCatalogItem => i.type === "3d-tiles")
      .some(
        (i) =>
          i.url?.startsWith(
            "https://tile.googleapis.com/v1/3dtiles/root.json"
          ) && i.show
      );

  return (
    <></>
    // <Box padded>

    // </Box>
  );
});

export default BottomLeftBar;
