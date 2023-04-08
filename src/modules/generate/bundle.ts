import {parseNodes} from 'modules/parse/nodes';
import {parseStyles} from 'modules/parse/styles';
import {generateComponent} from 'modules/generate/component';
import {generatePreview} from 'modules/generate/preview';
import {generateStory} from 'modules/generate/story';
import {getName} from 'utils/figma';

import type {EditorComponent, EditorLinks} from 'types/editor';
import type {ParsedComponent} from 'types/parse';
import type {TargetNode} from 'types/figma';
import type {Settings} from 'types/settings';

export function generateBundle(component: TargetNode, settings: Settings, noPreview?: boolean): EditorComponent {
  if (!component) {
    return {name: '',  code: '', story: '', preview: '', links: {}};
  }

  const root: ParsedComponent = {
    id: component.id,
    tag: 'View',
    slug: 'root',
    node: component,
    name: getName(component.name),
    styles: parseStyles(component, true),
  };

  const parsed = parseNodes([...component.children]);
  const links: EditorLinks = {};
  Object.entries(parsed.state.components).forEach((c: any) => {
    links[getName(c[1].name)] = c[0];
  });

  return {
    name: root.name,
    code: generateComponent(root, parsed, settings),
    story: generateStory(root, settings),
    preview: !noPreview ? generatePreview(root, component.children, settings) : '',
    links,
  };
}