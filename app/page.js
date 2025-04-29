const HomePage = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">
        About the Beehive Data Project
      </h1>

      <p className="mb-4">
        This BI data project focuses on monitoring beehives across Åland
        Islands, providing real-time data to beekeepers about their hives'
        performance. Key metrics include weight, temperature, and humidity.
      </p>

      <p className="mb-4">
        Beekeepers can track and analyze production data to optimize the health
        and efficiency of their hives. This system ensures that hive conditions
        are ideal for maximum honey production year-round.
      </p>

      <p className="mb-4">
        In the future, the platform will incorporate predictive analytics to
        forecast honey production, empowering owners with actionable insights
        for better decision-making and planning.
      </p>
    </div>
  );
};

export default HomePage;
