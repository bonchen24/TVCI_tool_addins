const fs = require('fs');
let xml = fs.readFileSync('manifest/manifest.xml', 'utf8');

const newGroup = `
              <Group id="GroupLegacyTools">
                <Label resid="LegacyToolsGroup.Label"/>
                <Icon>
                  <bt:Image size="16" resid="Icon.Rule.16"/>
                  <bt:Image size="32" resid="Icon.Rule.32"/>
                  <bt:Image size="80" resid="Icon.Rule.80"/>
                </Icon>
                <Control xsi:type="Button" id="ConvertUnicodeButton">
                  <Label resid="ConvertUnicode.Label"/>
                  <Supertip><Title resid="ConvertUnicode.Label"/><Description resid="ConvertUnicode.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Rule.16"/>
                    <bt:Image size="32" resid="Icon.Rule.32"/>
                    <bt:Image size="80" resid="Icon.Rule.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>convertSelectionToUnicode</FunctionName></Action>
                </Control>
                <Control xsi:type="Button" id="FixSpacingButton">
                  <Label resid="FixSpacing.Label"/>
                  <Supertip><Title resid="FixSpacing.Label"/><Description resid="FixSpacing.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Rule.16"/>
                    <bt:Image size="32" resid="Icon.Rule.32"/>
                    <bt:Image size="80" resid="Icon.Rule.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>fixSpacingQuick</FunctionName></Action>
                </Control>
                <Control xsi:type="Button" id="FixLineBreaksButton">
                  <Label resid="FixLineBreaks.Label"/>
                  <Supertip><Title resid="FixLineBreaks.Label"/><Description resid="FixLineBreaks.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Rule.16"/>
                    <bt:Image size="32" resid="Icon.Rule.32"/>
                    <bt:Image size="80" resid="Icon.Rule.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>fixManualLineBreaksCmd</FunctionName></Action>
                </Control>
                <Control xsi:type="Button" id="PunctuationFormatButton">
                  <Label resid="PunctuationFormat.Label"/>
                  <Supertip><Title resid="PunctuationFormat.Label"/><Description resid="PunctuationFormat.Tooltip"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.Rule.16"/>
                    <bt:Image size="32" resid="Icon.Rule.32"/>
                    <bt:Image size="80" resid="Icon.Rule.80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction"><FunctionName>normalizePunctuationCmd</FunctionName></Action>
                </Control>
              </Group>`;

xml = xml.replace('<Group id="GroupLibraryAi">', newGroup + '\n              <Group id="GroupLibraryAi">');

const newShortStrings = `
        <bt:String id="LegacyToolsGroup.Label" DefaultValue="CÃ´ng cá»¥ vÄƒn báº£n cÅ©"/>
        <bt:String id="ConvertUnicode.Label" DefaultValue="Chuyá»ƒn mÃ£ Unicode"/>
        <bt:String id="FixSpacing.Label" DefaultValue="XÃ³a dÃ¡u cÃ¡ch thá»«a"/>
        <bt:String id="FixLineBreaks.Label" DefaultValue="Sá»­a lá»—i xuá»‘ng dÃ²ng"/>
        <bt:String id="PunctuationFormat.Label" DefaultValue="Chuáº©n hÃ³a dÃ¡u cÃ¢u"/>`;
xml = xml.replace('</bt:ShortStrings>', newShortStrings + '\n      </bt:ShortStrings>');

const newLongStrings = `
        <bt:String id="ConvertUnicode.Tooltip" DefaultValue="Chuyá»ƒn mÃ£ TCVN3/VNI sang Unicode"/>
        <bt:String id="FixSpacing.Tooltip" DefaultValue="XÃ³a khoáº£ng tráº¯ng thá»«a trong vÄƒn báº£n"/>
        <bt:String id="FixLineBreaks.Tooltip" DefaultValue="Sá»­a lá»—i dÃ¹ng Shift+Enter ngáº¯t dÃ²ng"/>
        <bt:String id="PunctuationFormat.Tooltip" DefaultValue="Sá»­a lá»—i khoáº£ng tráº¯ng trÆ°á»›c sau dÃ¡u cÃ¢u"/>`;
xml = xml.replace('</bt:LongStrings>', newLongStrings + '\n      </bt:LongStrings>');

fs.writeFileSync('manifest/manifest.xml', xml);
console.log('Manifest updated successfully.');
