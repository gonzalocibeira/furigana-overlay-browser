import {uiTheme} from './ui-theme';

const theme=document.createElement('style');
theme.textContent=uiTheme;
document.head.append(theme);
document.querySelector('#version')!.textContent=`Version ${chrome.runtime.getManifest().version}`;
