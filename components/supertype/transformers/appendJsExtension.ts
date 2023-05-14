import * as typescript from 'typescript';
import * as path from 'path';

const transformer = (_: typescript.Program) => (transformationContext: typescript.TransformationContext) => (sourceFile: typescript.SourceFile) => {
	function visitNode(node: typescript.Node): typescript.VisitResult<typescript.Node> {
		if (shouldMutateModuleSpecifier(node)) {
			if (typescript.isImportDeclaration(node)) {
				const newModuleSpecifier = typescript.factory.createStringLiteral(`${node.moduleSpecifier.text}.js`);
                return typescript.factory.updateImportDeclaration(node, typescript.getModifiers(node), node.importClause, newModuleSpecifier, undefined);
			} else if (typescript.isExportDeclaration(node)) {
				const newModuleSpecifier = typescript.factory.createStringLiteral(`${node.moduleSpecifier.text}.js`);
                return typescript.factory.updateExportDeclaration(node, typescript.getModifiers(node), node.isTypeOnly, node.exportClause, newModuleSpecifier, undefined);
			}
		}

		return typescript.visitEachChild(node, visitNode, transformationContext);
	}

	function shouldMutateModuleSpecifier(node: typescript.Node): node is (typescript.ImportDeclaration | typescript.ExportDeclaration) & { moduleSpecifier: typescript.StringLiteral } {
		return !((!typescript.isImportDeclaration(node) && !typescript.isExportDeclaration(node)) ||
			// only when module specifier is valid
		    (node.moduleSpecifier === undefined) ||
			// only when path is relative
			(!typescript.isStringLiteral(node.moduleSpecifier)) ||
			// only when path is relative
			(!node.moduleSpecifier.text.startsWith('./') && !node.moduleSpecifier.text.startsWith('../')) ||
			// only when module specifier has no extension
			(path.extname(node.moduleSpecifier.text) !== ''));
	}

	return typescript.visitNode(sourceFile, visitNode);
}

export default transformer;