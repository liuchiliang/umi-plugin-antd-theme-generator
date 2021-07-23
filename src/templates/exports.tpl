export const themes = {{{ themes }}}

export const changeTheme = (key) => {
  const theme = themes.find(t => t.key === key);
  if (!theme) {
    return;
  }
  const filename = theme.filename || `${theme.key}.css`
  let styleLink = document.getElementById('theme-style');
  if (styleLink) {
    styleLink.href = `/theme/${filename}`;
  } else {
    styleLink = document.createElement('link');
    styleLink.type = 'text/css';
    styleLink.rel = 'stylesheet';
    styleLink.id = 'theme-style';
    styleLink.href = `/theme/${filename}`;
    document.body.append(styleLink);
  }
};