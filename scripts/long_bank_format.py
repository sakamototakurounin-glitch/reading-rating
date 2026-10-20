"""Validate legacy/current answer metadata and emit the current four-point format."""
import copy
import json
import sys

POINTS_PER_CORRECT = 4


def normalize_long_bank(bank):
    result = copy.deepcopy(bank)
    seen = set()
    if not isinstance(result.get('items'), list) or not result['items']:
        raise ValueError('Long bank must contain items')
    for item in result['items']:
        if item['id'] in seen:
            raise ValueError('Duplicate passage ID: ' + item['id'])
        seen.add(item['id'])
        if len(item['questions']) != 5:
            raise ValueError('Long passages require five questions: ' + item['id'])
        for question in item['questions']:
            choices = question['choices']
            correct = [c for c in choices if c['id'] == question['correct_choice_id']]
            if len(choices) != 4 or len({c['id'] for c in choices}) != 4 or len(correct) != 1:
                raise ValueError('Invalid choices/correct ID: ' + question['id'])
            if correct[0]['score'] not in (3, POINTS_PER_CORRECT):
                raise ValueError('Unsupported correct score: ' + question['id'])
            if any(c['score'] != 0 for c in choices if c is not correct[0]):
                raise ValueError('Incorrect choices must score zero: ' + question['id'])
            correct[0]['score'] = POINTS_PER_CORRECT
    return result


if __name__ == '__main__':
    json.dump(normalize_long_bank(json.load(sys.stdin)), sys.stdout, ensure_ascii=False)
    sys.stdout.write('\n')
