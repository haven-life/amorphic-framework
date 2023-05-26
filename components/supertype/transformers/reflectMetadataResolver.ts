import * as typescript from 'typescript';

const transformer = (_: typescript.Program) => (transformationContext: typescript.TransformationContext) => (sourceFile: typescript.SourceFile) => {
    function visitNode(node: typescript.Node): typescript.VisitResult<typescript.Node> {
        try {
            /* 
                @property decorators use reflect-metadata and generate ____metadata expressions for the class type.
                For ESM this will conflict with the dependency tree as not all the classes will be loaded when this happens,
                as described in this issue:
                    https://github.com/microsoft/TypeScript/issues/27519
                This will look through the classes an the reflect and apply a resolver if it is not a built-in Javascript object.
            */
            if (typescript.isCallExpression(node) && typescript.isIdentifier(node.expression) && node.expression.escapedText === '___metadata') {
                const newArguments = node.arguments.map(argument => transformExpression(argument));
                return typescript.factory.updateCallExpression(node, node.expression, node.typeArguments, newArguments);
            }
        } catch (e) {
            console.log('transformer metadata resolver error', e);
        }

        return typescript.visitEachChild(node, visitNode, transformationContext)
    }
    
    return typescript.visitNode(sourceFile, visitNode)
}

const transformExpression = (expression: typescript.Expression) => {
    let transformedExpression = expression;
    if (typescript.isIdentifier(expression) && typeof global[expression.escapedText.toString()] !== 'function') {
        transformedExpression = typescript.factory.createIdentifier(`() => { try { return ${expression.escapedText.toString()}; } catch { return '${expression.escapedText.toString()}'; } }`);
    } else if (typescript.isArrayLiteralExpression(expression) && expression.elements) {
        const newElements = expression.elements.map(element => transformExpression(element));
        transformedExpression = typescript.factory.updateArrayLiteralExpression(expression, newElements);
    }
    return transformedExpression;
}

export default transformer;