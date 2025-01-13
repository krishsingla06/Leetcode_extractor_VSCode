def fact(x):
    if x == 0:
        return 1
    else:
        return x * fact(x - 1)

def nCr(n, r):
    return fact(n) / (fact(r) * fact(n - r))

def two_sum_in_array(arr, target_sum):
    for i in range(len(arr)):
        for j in range(i+1, len(arr)):
            if arr[i] + arr[j] == target_sum:
                return True
    return False

def nQueen(board, col):
    if col >= N:
        return True
    for i in range(N):
        if isSafe(board, i, col):
            board[i][col] = 1
            if nQueen(board, col + 1):
                return True
            board[i][col] = 0
    return False


a=10;b=5;
print(nCr(a, b))

arr=[1,2,3,4,5,6,7,8,9,10]; target_sum=15;
print(two_sum_in_array(arr, target_sum))

