const SpinnerSmall = ({mt, mx, w, h, border}) => {
  return (
    <div className={`${mt} ${mx} ${w} ${h} border-2 ${border} border-t-transparent rounded-full animate-spin`}></div>
  );
};

export default SpinnerSmall;
