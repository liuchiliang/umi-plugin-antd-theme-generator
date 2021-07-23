function containsVariable(ruleNode) {
  let nodes = [ruleNode];

  while (nodes.length > 0) {
    const node = nodes.pop();

    if (typeof node.name === 'string' && node.name.startsWith('@')) {
      return true;
    }

    if (node.type == 'Variable') {
      return true;
    }

    if (!node.value) {
      continue;
    }
  
    if (typeof node.value === 'string' || typeof node.value === 'number') {
      continue;
    }
  
    if (node.value instanceof Array) {
      nodes.push(...node.value);
      continue;
    }

    nodes.push(node.value);
  }

  return false;
}

var RemoveProperty = function (less) {
  this.less = less;
  this._visitor = new less.visitors.Visitor(this);
};

RemoveProperty.prototype = {
  isReplacing: true,
  isPreEvalVisitor: true,
  run: function (root) {
    return this._visitor.visit(root);
  },
  visitRuleset: function (ruleNode, visitArgs) {
    this._inRule = true;
    return ruleNode;
  },
  visitRulesetOut: function (ruleNode, visitArgs) {
    this._inRule = false;
  },
  visitDeclaration: function (ruleNode, visitArgs) {
    if (!containsVariable(ruleNode)) {
      return new this.less.tree.Node();
    }
    return ruleNode;
  },
};

module.exports = {
  install: function (less, pluginManager) {
    pluginManager.addVisitor(new RemoveProperty(less));
  },
};
