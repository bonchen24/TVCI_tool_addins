const fs = require('fs');

const path = 'manifest/manifest.xml';
let xml = fs.readFileSync(path, 'utf8');

// Replace GroupStandardize
const newGroupStandardize = `              <Group id="GroupStandardize">
                <Label resid="StandardizeGroup.Label"/>
                <Icon>
                  <bt:Image size="16" resid="Icon.Proofread.16"/>
                  <bt:Image size="32" resid="Icon.Proofread.32"/>
                  <bt:Image size="80" resid="Icon.Proofread.80"/>
                </Icon>
                <Control xsi:type="Button" id="CheckDocumentButton">
                  <Label resid="CheckDocument.Label"/>
                  <Supertip><Title resid="CheckDocument.Label"/><Description resid="CheckDocument.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Proofread.16"/>
                    <bt:Image size="32" resid="Icon.Proofread.32"/>
                    <bt:Image size="80" resid="Icon.Proofread.80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane"><TaskpaneId>Office.AutoShowTaskpaneWithDocument</TaskpaneId><SourceLocation resid="Taskpane.Standardize.Url"/></Action>
                </Control>
                <Control xsi:type="Button" id="QuickStandardizeButton">
                  <Label resid="QuickStandardize.Label"/>
                  <Supertip><Title resid="QuickStandardize.Label"/><Description resid="QuickStandardize.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Proofread.16"/>
                    <bt:Image size="32" resid="Icon.Proofread.32"/>
                    <bt:Image size="80" resid="Icon.Proofread.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>run1ClickStandardize</FunctionName></Action>
                </Control>
                <Control xsi:type="Button" id="RollbackButton">
                  <Label resid="Rollback.Label"/>
                  <Supertip><Title resid="Rollback.Label"/><Description resid="Rollback.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Proofread.16"/>
                    <bt:Image size="32" resid="Icon.Proofread.32"/>
                    <bt:Image size="80" resid="Icon.Proofread.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>runRollbackLastAction</FunctionName></Action>
                </Control>
              </Group>`;

xml = xml.replace(/<Group id="GroupStandardize">[\s\S]*?<\/Group>/, newGroupStandardize);

// Replace GroupAppendix with GroupPageLayout
const newGroupPageLayout = `              <Group id="GroupPageLayout">
                <Label resid="PageLayoutGroup.Label"/>
                <Icon>
                  <bt:Image size="16" resid="Icon.Rule.16"/>
                  <bt:Image size="32" resid="Icon.Rule.32"/>
                  <bt:Image size="80" resid="Icon.Rule.80"/>
                </Icon>
                <Control xsi:type="Button" id="StandardA4Button">
                  <Label resid="StandardA4.Label"/>
                  <Supertip><Title resid="StandardA4.Label"/><Description resid="StandardA4.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Rule.16"/>
                    <bt:Image size="32" resid="Icon.Rule.32"/>
                    <bt:Image size="80" resid="Icon.Rule.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>applyA4Margins</FunctionName></Action>
                </Control>
                <Control xsi:type="Button" id="DeleteBlankPagesButton">
                  <Label resid="DeleteBlankPages.Label"/>
                  <Supertip><Title resid="DeleteBlankPages.Label"/><Description resid="DeleteBlankPages.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Rule.16"/>
                    <bt:Image size="32" resid="Icon.Rule.32"/>
                    <bt:Image size="80" resid="Icon.Rule.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>cleanBlankPagesSafe</FunctionName></Action>
                </Control>
                <Control xsi:type="Button" id="FixTableOverflowButton">
                  <Label resid="FixTableOverflow.Label"/>
                  <Supertip><Title resid="FixTableOverflow.Label"/><Description resid="FixTableOverflow.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Table.16"/>
                    <bt:Image size="32" resid="Icon.Table.32"/>
                    <bt:Image size="80" resid="Icon.Table.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>autoFitTableToWindow</FunctionName></Action>
                </Control>
              </Group>`;

xml = xml.replace(/<Group id="GroupAppendix">[\s\S]*?<\/Group>/, newGroupPageLayout);

// Add missing short/long strings
const shortStrings = `
        <bt:String id="QuickStandardize.Label" DefaultValue="Chuẩn hóa 1-click"/>
        <bt:String id="Rollback.Label" DefaultValue="Hoàn tác"/>
        <bt:String id="PageLayoutGroup.Label" DefaultValue="Bố cục trang"/>
        <bt:String id="StandardA4.Label" DefaultValue="Lề A4 chuẩn"/>
        <bt:String id="DeleteBlankPages.Label" DefaultValue="Xóa trang trắng"/>
        <bt:String id="FixTableOverflow.Label" DefaultValue="Sửa bảng tràn"/>
      </bt:ShortStrings>`;
xml = xml.replace(/<\/bt:ShortStrings>/, shortStrings);

const longStrings = `
        <bt:String id="QuickStandardize.Tooltip" DefaultValue="Chuẩn hóa 1-click tự động"/>
        <bt:String id="Rollback.Tooltip" DefaultValue="Hoàn tác chuẩn hóa trước đó"/>
        <bt:String id="StandardA4.Tooltip" DefaultValue="Áp dụng lề A4 chuẩn"/>
        <bt:String id="DeleteBlankPages.Tooltip" DefaultValue="Xóa trang trắng ở cuối"/>
        <bt:String id="FixTableOverflow.Tooltip" DefaultValue="Tự động thu gọn bảng vừa trang"/>
      </bt:LongStrings>`;
xml = xml.replace(/<\/bt:LongStrings>/, longStrings);

fs.writeFileSync(path, xml);
