export const themes = {{{ themes }}}
const publicPath = '{{{ publicPath }}}'

export const changeTheme = (key) => {
  const theme = themes.find(t => t.key === key);
  if (!theme) {
    return;
  }
  const filename = theme.filename || `${theme.key}.css`
  let styleLink = document.getElementById('theme-style');
  if (styleLink) {
    styleLink.href = `${publicPath}theme/${filename}`;
  } else {
    styleLink = document.createElement('link');
    styleLink.type = 'text/css';
    styleLink.rel = 'stylesheet';
    styleLink.id = 'theme-style';
    styleLink.href = `${publicPath}theme/${filename}`;
    document.body.append(styleLink);
  }
};