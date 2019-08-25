import { styled } from 'astroturf';

const RedPasswordInput = styled('input', null, {
  displayName: "RedPasswordInput",
  styles: require("./with-props-RedPasswordInput.css"),
  attrs: props => ({ ...props,
    type: 'password'
  }),
  vars: []
});

const RedPasswordInput2 = styled('input', null, {
  displayName: "RedPasswordInput2",
  styles: require("./with-props-RedPasswordInput2.css"),
  attrs: p => ({
    type: 'password'
  }),
  vars: []
});
