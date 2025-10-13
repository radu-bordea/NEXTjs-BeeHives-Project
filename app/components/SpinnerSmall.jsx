const SpinnerSmall = ({mt, mx, w, h, color}) => {
  return (
    <div className={`${mt} ${mx} ${w} ${h} border-2 border-${color}-600 border-t-transparent rounded-full animate-spin`}></div>
  );
};

export default SpinnerSmall;
