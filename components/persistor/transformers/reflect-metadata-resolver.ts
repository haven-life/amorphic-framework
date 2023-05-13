import * as typescript from 'typescript';

const generics = new Set(['number', 'date', 'array', 'string']);

const transformer = (_: typescript.Program) => (transformationContext: typescript.TransformationContext) => (sourceFile: typescript.SourceFile) => {
	function visitNode(node: typescript.Node): typescript.VisitResult<typescript.Node> {
		try {
			if (typescript.isCallExpression(node) && typescript.isIdentifier(node.expression) && node.expression.escapedText === '___metadata') {
				const nodeArguments = node.arguments;
				const newArguments: typescript.Expression[] = [];
				for (let argument of nodeArguments) {
					let newArgument = argument;
					if (typescript.isIdentifier(argument) && !generics.has(argument.escapedText.toString().toLowerCase())) {
						newArgument = typescript.factory.createIdentifier(`() => ${argument.escapedText}`);
					}
					newArguments.push(newArgument);
				}
				return typescript.factory.updateCallExpression(node, node.expression, node.typeArguments, newArguments);
			}
		} catch (e) {
			console.log('transformer metadata resolver error', e);
		}

		return typescript.visitEachChild(node, visitNode, transformationContext)
	}
	

	return typescript.visitNode(sourceFile, visitNode)
}

export default transformer;