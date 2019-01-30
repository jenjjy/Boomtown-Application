const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    lineHeight: 2
    // minWidth: 300
  },
  textField: {
    // marginLeft: theme.spacing.unit,
    // marginRight: theme.spacing.unit,

    width: '100%'
  },
  dense: {
    marginTop: 19
  },
  menu: {
    // minWidth: 200,
    width: '100%'
  },
  formControl: {
    // margin: theme.spacing.unit,
    width: '100%'
  },
  dropDown: {
    width: '100%'
  },
  header: {
    fontSize: '2.8rem',
    fontWeight: 700,
    lineHeight: '1',
    marginBottom: '3rem'
    // maxWidth: 0.5
  },
  imageButton: {
    background: theme.palette.primary.main,
    width: '100%'
  },
  resetImage: {
    background: '#fff',
    border: '1px solid #D3D3D3',
    width: '100%'
  },
  shareButton: {
    background: theme.palette.primary.main,
    marginTop: '2rem',
    padding: '0.5rem 1.5rem'
  }
});

export default styles;
