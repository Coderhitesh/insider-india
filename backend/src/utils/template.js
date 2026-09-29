const render = (str, vars = {}) =>
  String(str || '').replace(/{{\s*([\w.]+)\s*}}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));

module.exports = { render };
