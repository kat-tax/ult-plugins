import {parseStyles} from 'modules/parse/styles';
import {getTag, getName, getSlug} from 'utils/figma';

import type {ParseData, ParseState, ParsedComponent} from 'types/parse';
import type {TargetNode} from 'types/figma';

export function parseNodes(nodes: TargetNode[], state?: ParseState): ParseData {
  // Init state (haven't recursed yet)
  if (!state) {
    state = {
      components: {},
      stylesheet: {},
      primitives: new Set(),
      libraries: new Set(),
    };
  }

  // Lines of codes will be inserted here
  let code: ParsedComponent[] = [];

  // Loop through each direct child node
  nodes.forEach((node) => {
    // Skip invisible nodes
    // TODO: conditionally render instead of skipping
    if ('visible' in node && !node.visible) return;

    // These node types can have styles
    const hasStyles = node.type === 'TEXT'
      || node.type === 'GROUP'
      || node.type === 'FRAME'
      || node.type === 'COMPONENT';

    // Create component
    const component: ParsedComponent = {
      node,
      id: node.id,
      tag: getTag(node.type),
      name: getName(node.name),
      slug: hasStyles && getSlug(node.name),
    };
  
    // Transform styles for child (if applicable)
    if (component.slug) {
      state.stylesheet[component.slug] = {
        tag: component.tag,
        style: parseStyles(node),
      };
    }

    // Parse Figma node depending on type
    switch (node.type) {

      // Group nodes get recursed & state is combined
      case 'GROUP':
      case 'FRAME':
      case 'COMPONENT': {
        const subnodes = parseNodes([...node.children], state);
        code.push({...component, children: subnodes.code});
        state = {
          components: {...state.components, ...subnodes.state.components},
          stylesheet: {...state.stylesheet, ...subnodes.state.stylesheet},
          primitives: new Set([...state.primitives, ...subnodes.state.primitives]),
          libraries: new Set([...state.libraries, ...subnodes.state.libraries]),
        };
        break;
      }

      // Instances get inserted w/ props and the master component recorded
      case 'INSTANCE': {
        const isVariant = !!node.variantProperties;
        const parent = isVariant ? node.masterComponent.parent : node.mainComponent;
        state.components[parent.id] = parent;
        code.push({...component, tag: getName(node.name), props: node.componentProperties});
        break;
      }

      // Text nodes get inserted and the primitive added
      case 'TEXT': {
        state.primitives.add('Text');
        code.push({...component, value: node.characters || ''});
        break;
      }
  
      // Image nodes get inserted, source saved, and the primitive added
      case 'IMAGE': {
        state.primitives.add('Image');
        break;
      }

      // TODO (rectangles & ellipses are just views, ellipses have 99999 border radius)
      // case 'RECTANGLE':
      // case 'ELLIPSE':

      // Vectors get inserted w/ paths, fills, dimensions, paths. Add RNSVG library.
      case 'VECTOR':
      case 'LINE':
      case 'STAR':
      case 'ELLIPSE':
      case 'POLYGON':
      case 'BOOLEAN_OPERATION': {
        state.libraries.add('react-native-svg');
        code.push({...component, paths: node.vectorPaths, fills: node.fills, box: node.absoluteBoundingBox});
        break;
      }

      default: {
        console.warn('parseNodes: UNSUPPORTED', node.type, node);
      }
    }
  });

  // Return lines of code, primitives, styles, and components
  return {code, state};
}