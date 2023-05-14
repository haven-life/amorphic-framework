import * as typescript from 'typescript';

const generics = new Set(['number', 'date', 'array', 'string', 'boolean', 'enum', 'any', 'unknown', 'void', 'object']);

const transformer = (_: typescript.Program) => (transformationContext: typescript.TransformationContext) => (sourceFile: typescript.SourceFile) => {
	function visitNode(node: typescript.Node): typescript.VisitResult<typescript.Node> {
		try {
			if (typescript.isCallExpression(node) && typescript.isIdentifier(node.expression) && node.expression.escapedText === '___metadata') {
				const newArguments = node.arguments.map(argument => 
					(typescript.isIdentifier(argument) && !generics.has(argument.escapedText.toString().toLowerCase())) ? 
						typescript.factory.createIdentifier(`() => ${argument.escapedText}`) : 
						argument
				);
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