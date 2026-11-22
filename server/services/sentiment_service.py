from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(text: str):
    """
    Analyzes text and returns the polarity compound score and sentiment label.
    Score: Float between -1 and 1
    Label: positive (>= 0.05), negative (<= -0.05), neutral (otherwise)
    """
    scores = analyzer.polarity_scores(text)
    compound = scores['compound']
    
    label = 'neutral'
    if compound >= 0.05:
        label = 'positive'
    elif compound <= -0.05:
        label = 'negative'
        
    return compound, label
